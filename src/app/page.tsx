import { redirect } from "next/navigation";

// Root route: send users to the main Explore page.
export default function Home() {
  redirect("/explore");
}
