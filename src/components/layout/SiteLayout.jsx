import React from "react";
import { Outlet } from "react-router-dom";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";

export default function SiteLayout() {
  return (
    <div className="min-h-screen aurora overflow-x-hidden">
      <Nav />
      <main className="pt-28">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}