import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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
    lat: 12.914, // near JP Nagar
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

describe("ServiceCenters - URL sync, filtering, and map behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Default: geolocation denied to keep deterministic center
    mockGeolocation({ allowed: false });
    // By default return list of centers for initial load
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

  test("initializes state from URL (?q=car%20service%20center&brand=TOYOTA) and updates list + inputs", async () => {
    renderAt("/centers?q=car%20service%20center&brand=TOYOTA");

    // Wait for initial load label to disappear and list render
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();
    // Input reflects URL 'q'
    const search = getSearchInput();
    expect(search).toHaveValue("car service center");

    // Brand reflects URL brand=TOYOTA
    const select = getBrandSelect();
    expect(select).toHaveValue("TOYOTA");

    // List shows filtered items (client filtering still renders from dataset)
    // At least one center card should appear
    const anyCard = await screen.findByRole("button", {
      name: /select/i,
    });
    expect(anyCard).toBeInTheDocument();

    // Map iframe exists with a src that includes OpenStreetMap embed
    const iframe = getMapIframe();
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src");
    expect(iframe.getAttribute("src")).toMatch(/openstreetmap\.org\/export\/embed\.html\?bbox=/);
  });

  test("changing search input updates URL query (debounced) without reload", async () => {
    renderAt("/centers");

    // Ensure initial content
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const search = getSearchInput();
    fireEvent.change(search, { target: { value: "Nandi" } });

    // Advance debounce (300ms)
    await act(async () => {
      jest.advanceTimersByTime(310);
    });

    // Assert URL updated - MemoryRouter manages history; use window.location.search
    expect(window.location.search).toMatch(/q=Nandi/);

    // Not a full reload - content remains
    expect(screen.getByText(/Service Centers/i)).toBeInTheDocument();
  });

  test("selecting a brand updates URL and filters list", async () => {
    renderAt("/centers?q=JP%20Nagar");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const select = getBrandSelect();
    // Change brand to HYUNDAI
    fireEvent.change(select, { target: { value: "HYUNDAI" } });

    // brand updates immediately (no debounce for select)
    expect(window.location.search).toMatch(/brand=HYUNDAI|brand=HYUNDAI/i);

    // Cards remain rendered; ensure at least one still visible
    const cards = await screen.findAllByRole("button", { name: /select/i });
    expect(cards.length).toBeGreaterThan(0);
  });

  test("back/forward navigation restores search/brand and list state", async () => {
    renderAt("/centers?q=Advaith&brand=HYUNDAI");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    // Make a change to q and brand
    fireEvent.change(getSearchInput(), { target: { value: "Nandi" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });
    fireEvent.change(getBrandSelect(), { target: { value: "TOYOTA" } });

    // URL should now include Nandi & brand=TOYOTA
    expect(window.location.search).toMatch(/q=Nandi/);
    expect(window.location.search).toMatch(/brand=TOYOTA/);

    // Simulate back - MemoryRouter won't change automatically; use history API to trigger popstate
    act(() => {
      window.history.pushState({}, "", "/centers?q=Advaith&brand=HYUNDAI");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Inputs reflect restored state
    expect(getSearchInput()).toHaveValue("Advaith");
    expect(getBrandSelect()).toHaveValue("HYUNDAI");
  });

  test("map iframe src updates when filters change (recenter/zoom) with geolocation denied", async () => {
    // geolocation denied in beforeEach
    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const iframeBefore = getMapIframe();
    const srcBefore = iframeBefore.getAttribute("src");
    expect(srcBefore).toMatch(/openstreetmap\.org\/export\/embed\.html\?bbox=/);

    // Change filters to narrow to one likely closest center
    fireEvent.change(getSearchInput(), { target: { value: "Advaith" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });

    const iframeAfter = getMapIframe();
    const srcAfter = iframeAfter.getAttribute("src");

    // The src should change to reflect new center or bbox
    expect(srcAfter).toBeTruthy();
    expect(srcAfter).not.toEqual(srcBefore);
    // Marker param exists
    expect(srcAfter).toMatch(/marker=/);
  });

  test("map iframe src updates when geolocation allowed (origin changes)", async () => {
    // Override geolocation to allow
    mockGeolocation({ allowed: true, lat: 12.90, lng: 77.57 });

    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();
    const iframe = getMapIframe();
    const src = iframe.getAttribute("src");
    expect(src).toMatch(/openstreetmap\.org\/export\/embed\.html\?bbox=/);
    // Should include marker with a lat/lng derived from filtered result near allowed location
    expect(src).toMatch(/marker=\d{1,2}\.\d+,\d{1,3}\.\d+/);
  });

  test("no matches shows friendly message and map center remains unchanged", async () => {
    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();
    const iframe = getMapIframe();
    const srcBefore = iframe.getAttribute("src");

    // Set a query that doesn't match any center
    fireEvent.change(getSearchInput(), { target: { value: "zzzzzzzzz" } });
    await act(async () => {
      jest.advanceTimersByTime(320);
    });

    // Friendly message
    expect(
      await screen.findByText(/No centers found for the current filters/i)
    ).toBeInTheDocument();

    // Map src remains same (no recenter on no-match)
    const srcAfter = getMapIframe().getAttribute("src");
    expect(srcAfter).toEqual(srcBefore);
  });

  test("fullscreen toggle exists, toggles aria-pressed and overlay class, and exits correctly", async () => {
    renderAt("/centers");

    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /fullscreen/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "false");

    // Toggle on
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    // Overlay class applied to map card container (parent of iframe)
    const mapContainer = btn.closest(".card")?.parentElement?.querySelector(".map-card");
    // As structure may differ, search by label
    const containers = screen.getAllByLabelText("Map container");
    expect(containers.length).toBeGreaterThan(0);
    const overlayFound = containers.some((c) =>
      c.className.includes("fullscreen-overlay")
    );
    expect(overlayFound).toBe(true);

    // Toggle off
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    const overlayStill = containers.some((c) =>
      c.className.includes("fullscreen-overlay")
    );
    expect(overlayStill).toBe(false);
  });

  test("fullscreen toggle has correct accessibility attributes", async () => {
    renderAt("/centers");
    expect(await screen.findByText(/Service Centers/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /fullscreen/i });
    expect(btn).toHaveAttribute("aria-label", expect.stringMatching(/fullscreen/i));
    expect(btn).toHaveAttribute("aria-pressed", "false");

    // Activate via keyboard (Enter)
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(btn).toHaveAttribute("aria-pressed", "true");

    // Deactivate via keyboard (Space)
    fireEvent.keyDown(btn, { key: " " });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});

