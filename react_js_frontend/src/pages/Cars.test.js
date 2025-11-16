import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import Cars from "./Cars";

test("Cars page renders header", () => {
  render(
    <BrowserRouter>
      <Cars />
    </BrowserRouter>
  );
  expect(screen.getByText(/All Cars/i)).toBeInTheDocument();
});

test("Routes include /cars path when mounted directly", () => {
  render(
    <MemoryRouter initialEntries={["/cars"]}>
      <Routes>
        <Route path="/cars" element={<Cars />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText(/All Cars/i)).toBeInTheDocument();
});
