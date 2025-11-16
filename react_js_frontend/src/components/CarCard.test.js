import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CarCard from "./CarCard";

test("CarCard renders name and view details link", () => {
  const car = { id: 123, name: "Test Car", type: "SUV", year: 2025, price: 12345 };
  render(
    <BrowserRouter>
      <CarCard car={car} />
    </BrowserRouter>
  );
  expect(screen.getByText("Test Car")).toBeInTheDocument();
  const link = screen.getByRole("link", { name: /view details/i });
  expect(link).toHaveAttribute("href", "/cars/123");
});
