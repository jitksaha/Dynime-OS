import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Map, MapPin, Route, Users, BarChart3, Navigation, Clock, Target, Truck, Building2 } from "lucide-react";

export default function TerritoryFeature() {
  return (
    <FeaturePageLayout
      title="Territory & Route Management"
      subtitle="Field Sales Optimization"
      description="Manage geographic sales territories, optimize visit routes, and track field team activities with GPS-verified check-ins."
      icon={Map}
      gradient="bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600"
      features={[
        { title: "Territory Assignment", description: "Assign geographic territories to sales reps or teams with boundary mapping.", icon: MapPin },
        { title: "Route Optimization", description: "AI-optimized visit route planning based on client location clusters.", icon: Route },
        { title: "GPS Check-In", description: "Mobile check-in and check-out at client premises with GPS verification.", icon: Navigation },
        { title: "Visit Planning", description: "Plan and schedule client visits with calendar integration and reminders.", icon: Clock },
        { title: "Coverage Analytics", description: "Territory coverage analysis with visit frequency and gap identification.", icon: BarChart3 },
        { title: "Performance by Territory", description: "Revenue and activity metrics segmented by territory and representative.", icon: Target },
      ]}
      detailSections={[
        {
          id: "territory",
          label: "Territory Management",
          icon: MapPin,
          color: "hsl(243,75%,58%)",
          title: "Define and manage sales territories",
          description: "Create geographic territories with clear boundaries, assign them to reps or teams, and ensure balanced coverage across your market.",
          points: [
            "Geographic territory definition",
            "Rep and team assignment",
            "Territory balance analysis",
            "Customer-territory mapping",
            "Territory transfer and reassignment",
          ],
        },
        {
          id: "routing",
          label: "Route Planning",
          icon: Route,
          color: "hsl(142,71%,45%)",
          title: "Smarter routes, more visits",
          description: "Optimize daily visit routes to minimize travel time and maximize client face time. GPS tracking ensures accountability.",
          points: [
            "AI-powered route suggestions",
            "Multi-stop route optimization",
            "GPS-verified check-in/check-out",
            "Visit duration tracking",
            "Missed visit alerts",
          ],
        },
      ]}
      stats={[
        { value: "30%", label: "More client visits per day" },
        { value: "25%", label: "Reduction in travel costs" },
        { value: "100%", label: "Field activity visibility" },
        { value: "40%", label: "Territory coverage improvement" },
      ]}
      useCases={[
        { title: "FMCG Distribution", description: "Optimize delivery and sales routes across retailers with territory-based planning.", icon: Truck },
        { title: "Pharmaceutical Sales", description: "Manage doctor and pharmacy visit schedules with compliance tracking.", icon: Target },
        { title: "Real Estate", description: "Territory-based property viewing schedules with client proximity routing.", icon: Building2 },
        { title: "Field Services", description: "Technician dispatch with location-based assignment and travel optimization.", icon: Navigation },
      ]}
      benefits={[
        "Geographic territory mapping",
        "AI route optimization",
        "GPS check-in verification",
        "Visit scheduling & planning",
        "Coverage gap analysis",
        "Travel cost tracking",
        "Performance by territory",
        "Customer visit history",
        "Field team accountability",
        "Real-time location tracking",
      ]}
      faqs={[
        { q: "How does route optimization work?", a: "The system analyzes client locations, planned visits, and travel distances to suggest the most efficient route for each day." },
        { q: "Can field reps check in via mobile?", a: "Yes. Reps use their mobile device to check in at client locations. GPS coordinates are recorded to verify physical presence." },
        { q: "How are territories assigned?", a: "Territories can be defined by geographic boundaries, postal codes, or client lists. Assign them to individual reps or teams." },
        { q: "Can I see real-time field activity?", a: "Yes. Managers see a live dashboard of field team locations, visit status, and planned vs. actual routes." },
      ]}
    />
  );
}
