import type { Metadata } from "next";
import FeedbackPanel from "@/components/FeedbackPanel";

export const metadata: Metadata = {
  title: "Feedback · Control Center",
};

export default function AdminFeedbackPage() {
  return <FeedbackPanel />;
}
