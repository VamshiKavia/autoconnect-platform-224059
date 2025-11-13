import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Under test
import ServiceCenters from "./ServiceCenters";

// Mock api client module used by ServiceCenters
jest.mock("../api/client", () => {
  return {
    apiGet: jest.fn(),
  };
});

import { apiGet } from "../api/client";

// Utility: mock geolocation
function mockGeolocation({ allowed = false, lat = 12.95, lng = 77.6 } = {}) {
  const getCurrentPosition = jest.fn((success, error) => {
    if (allowed) {
      success({
        coords: { latitude: lat, longitude: lng },
      });
    } else {
      error?.(new Error("Denied"));
    }
  });
  Object.defineProperty(global.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
}

// Utility: render with router at /centers with optional query
function renderAt(initialPath = "/centers") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/centers" element={<ServiceCenters />} />
      </Routes>
    </MemoryRouter>
  );
}

// Stable mock dataset of centers around Bangalore
const MOCK_CENTERS = [
  {
    id: "mandovi-jpn",
    name: "Mandovi Motors JP Nagar",
    address: "JP Nagar 1st Phase, Bengaluru",
    lat: 12.914,
    lng: 77.585,
    phone: "+91-80-2244-0000",
  },
  {
    id: "nandi-toyota",
    name: "Nandi Toyota Service",
    address: "JP Nagar, Bengaluru",
    lat: 12.91,
    lng: 77.6,
    phone: "+91-80-3500-0000",
  },
  {
    id: "advaith-hyundai",
    name: "Advaith Hyundai JP Nagar",
    address: "JP Nagar 2nd Phase, Bengaluru",
    lat: 12.905,
    lng: 77.59,
    phone: "+91-80-4347-0000",
  },
];

describe("ServiceCenters - explicit Search apply behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGeolocation({ allowed: false });
    apiGet.mockImplementation(async (path) => {
      if (String(path).startsWith("/service-centers")) {
        return MOCK_CENTERS;
      }
      return [];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function getMapIframe() {
    return screen.getByTitle("Service Centers Map");
  }

  function getSearchInput() {
    return screen.getByLabelText(/search service centers/i);
  }

  function getBrandSelect() {
    return screen.getByLabelText(/filter by brand/i);
  }

  function getSearchButton() {
    return screen.getByRole("button", { name: /search service centers with current filters/i });
  }

  test("initializes inputs and applied state from URL, renders list and map", async () => {
    renderAt("/centers?q=car%20service%20center&brand=TOYOTA");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    expect(getSearchInput()).toHaveValue("car service center");
    expect(getBrandSelect()).toHaveValue("TOYOTA");

    const anyCard = await screen.findByRole("button", { name: /select/i });
    expect(anyCard).toBeInTheDocument();

    const iframe = getMapIframe();
    expect(iframe).toHaveAttribute("src");
    expect(iframe.getAttribute("src")).toMatch(/openstreetmap\.org\/export\/embed\.html\?bbox=/);
  });

  test("typing updates URL preview (debounced) but map/list do not change until Search clicked", async () => {
    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const iframeBefore = getMapIframe();
    const srcBefore = iframeBefore.getAttribute("src");

    const search = getSearchInput();
    fireEvent.change(search, { target: { value: "Advaith" } });

    // URL preview updates after debounce
    await act(async () => {
      jest.advanceTimersByTime(320);
    });
    expect(window.location.search).toMatch(/q=Advaith/);

    // But map src should remain unchanged until submit
    expect(getMapIframe().getAttribute("src")).toEqual(srcBefore);

    // Click Search to apply filters
    fireEvent.click(getSearchButton());

    // Now map should change (recenter)
    const srcAfter = getMapIframe().getAttribute("src");
    expect(srcAfter).toBeTruthy();
    expect(srcAfter).not.toEqual(srcBefore);
    expect(srcAfter).toMatch(/marker=/);
  });

  test("brand selection updates URL preview immediately, applies only after Search submit", async () => {
    renderAt("/centers?q=JP%20Nagar");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const iframeBefore = getMapIframe().getAttribute("src");

    fireEvent.change(getBrandSelect(), { target: { value: "HYUNDAI" } });
    expect(window.location.search).toMatch(/brand=HYUNDAI/);

    // Not applied yet; map unchanged
    expect(getMapIframe().getAttribute("src")).toEqual(iframeBefore);

    // Submit to apply
    fireEvent.click(getSearchButton());
    const srcAfter = getMapIframe().getAttribute("src");
    expect(srcAfter).not.toEqual(iframeBefore);
  });

  test("Enter key in search input submits and applies filters", async () => {
    renderAt("/centers");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const srcBefore = getMapIframe().getAttribute("src");

    const input = getSearchInput();
    fireEvent.change(input, { target: { value: "Nandi" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });
    // Press Enter to submit
    fireEvent.keyDown(input, { key: "Enter" });

    const srcAfter = getMapIframe().getAttribute("src");
    expect(srcAfter).not.toEqual(srcBefore);
  });

  test("Search button disabled when inputs are empty or unchanged", async () => {
    renderAt("/centers");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    // Initially both empty -> disabled
    expect(getSearchButton()).toBeDisabled();

    // Type then revert to same applied state (still empty after trimming)
    fireEvent.change(getSearchInput(), { target: { value: "   " } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });
    expect(getSearchButton()).toBeDisabled();

    // Change to something -> enabled
    fireEvent.change(getSearchInput(), { target: { value: "Advaith" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });
    expect(getSearchButton()).not.toBeDisabled();

    // Submit to apply
    fireEvent.click(getSearchButton());
    // Now unchanged vs applied -> disabled again
    expect(getSearchButton()).toBeDisabled();
  });

  test("back/forward navigation restores inputs and applied state", async () => {
    renderAt("/centers?q=Advaith&brand=HYUNDAI");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    // Type and change brand (URL preview)
    fireEvent.change(getSearchInput(), { target: { value: "Nandi" } });
    await act(async () => jest.advanceTimersByTime(320));
    fireEvent.change(getBrandSelect(), { target: { value: "TOYOTA" } });
    expect(window.location.search).toMatch(/q=Nandi/);
    expect(window.location.search).toMatch(/brand=TOYOTA/);

    // Simulate back to previous state in URL
    act(() => {
      window.history.pushState({}, "", "/centers?q=Advaith&brand=HYUNDAI");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Inputs restored
    expect(getSearchInput()).toHaveValue("Advaith");
    expect(getBrandSelect()).toHaveValue("HYUNDAI");

    // Search button is disabled because unchanged vs applied state
    expect(getSearchButton()).toBeDisabled();
  });

  test("no matches after applying filters shows friendly message and map center remains unchanged", async () => {
    renderAt("/centers");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const srcBefore = getMapIframe().getAttribute("src");

    // Type a non-matching query
    fireEvent.change(getSearchInput(), { target: { value: "zzzzzzzzz" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });

    // Not applied yet -> click Search
    fireEvent.click(getSearchButton());

    expect(
      await screen.findByText(/No centers found for the current filters/i)
    ).toBeInTheDocument();

    const srcAfter = getMapIframe().getAttribute("src");
    expect(srcAfter).toEqual(srcBefore);
  });

  test("fullscreen toggle exists, toggles aria-pressed and overlay class, and exits correctly", async () => {
    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /fullscreen/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    const containers = screen.getAllByLabelText("Map container");
    expect(containers.length).toBeGreaterThan(0);
    const overlayFound = containers.some((c) => c.className.includes("fullscreen-overlay"));
    expect(overlayFound).toBe(true);

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    const overlayStill = containers.some((c) => c.className.includes("fullscreen-overlay"));
    expect(overlayStill).toBe(false);
  });

  test("fullscreen toggle accessibility (Enter/Space)", async () => {
    renderAt("/centers");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /fullscreen/i });
    expect(btn).toHaveAttribute("aria-label", expect.stringMatching(/fullscreen/i));
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(btn, { key: "Enter" });
    expect(btn).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(btn, { key: " " });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});

