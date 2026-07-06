// @ts-nocheck
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedHRMS } from "@/components/illustrations";
import {
  Users, Clock, Wallet, CalendarDays, UserPlus, TrendingUp,
  Shield, Building2, GraduationCap, FileCheck, Bell, Globe,
  Briefcase, Heart, Award, BarChart3, Network, UserCheck,
} from "lucide-react";

export default function HRMSFeature() {
  return (
    <FeaturePageLayout
      title="Complete HRMS Solution"
      subtitle="Human Resource Management"
      description="Manage your entire workforce lifecycle — hiring, onboarding, attendance, payroll, performance reviews, and employee self-service — from one unified platform."
      icon={Users}
      gradient="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"
      heroIllustration={<AnimatedHRMS />}
      features={[
        { title: "Org Chart Visualization", description: "Auto-generated interactive organizational chart from reporting structure with drag-and-drop editing.", icon: Network },
        { title: "Employee Self-Service", description: "Employees update profiles, apply for leave, view payslips, and manage documents — zero HR bottleneck.", icon: UserCheck },
        { title: "360° Performance Reviews", description: "Multi-rater review cycles with rating templates, competency mapping, and goal integration.", icon: TrendingUp },
        { title: "Onboarding Workflows", description: "Day 1-90 structured checklists with auto-assigned tasks to HR, IT, and manager.", icon: FileCheck },
        { title: "Payroll & Compliance", description: "Auto-calculated salary with tax deductions, festival bonuses, and NBR-compliant payslips.", icon: Wallet },
        { title: "Attendance & Shifts", description: "Geo-fenced check-in, configurable shifts, late tracking, and overtime auto-calculation.", icon: Clock },
      ]}
      detailSections={[
        {
          id: "orgchart",
          label: "Org Chart",
          icon: Network,
          color: "hsl(270,80%,60%)",
          title: "See your organization structure at a glance",
          description: "Auto-generated organizational charts from reporting relationships. Zoom, search, and click into any node to see employee details, team composition, and reporting lines.",
          points: [
            "Auto-generated from reporting structure",
            "Interactive zoom, search, and drill-down",
            "Drag-and-drop restructuring",
            "Department and team grouping",
            "Vacancy and open position markers",
          ],
        },
        {
          id: "payroll",
          label: "Payroll & Compensation",
          icon: Wallet,
          color: "hsl(243,75%,58%)",
          title: "Zero-error payroll, every single month",
          description: "Automatically calculate salaries based on attendance, leaves, overtime, and tax brackets. Festival bonus automation, salary scaleup workflows, and multi-currency support.",
          points: [
            "Auto-calculated salary based on attendance",
            "Tax deductions with Bangladesh NBR compliance",
            "Festival bonus automation (Eid, Puja)",
            "Salary scaleup with approval workflows",
            "Employee loan & EMI tracking",
          ],
        },
        {
          id: "performance",
          label: "Performance Management",
          icon: TrendingUp,
          color: "hsl(142,71%,45%)",
          title: "360° reviews that drive growth",
          description: "Conduct comprehensive performance reviews with self, peer, manager, and subordinate feedback. Link reviews to OKR completion, training progress, and career development.",
          points: [
            "360-degree multi-rater reviews",
            "Competency and skill mapping",
            "Rating templates (1-5, letter grades)",
            "Goal integration from OKR module",
            "Review cycle scheduling and reminders",
          ],
        },
        {
          id: "onboarding",
          label: "Onboarding",
          icon: FileCheck,
          color: "hsl(38,92%,50%)",
          title: "Seamless Day 1 to Day 90 experience",
          description: "Structured onboarding checklists with auto-assigned tasks to HR, IT, and hiring managers. Track completion, send reminders, and ensure nothing falls through the cracks.",
          points: [
            "Day 1-90 structured checklists",
            "Auto-assigned tasks to HR, IT, manager",
            "Equipment and access provisioning",
            "Welcome email and document sharing",
            "Onboarding completion tracking",
          ],
        },
      ]}
      stats={[
        { value: "60%", label: "Reduction in HR admin work" },
        { value: "99.9%", label: "Payroll accuracy rate" },
        { value: "3x", label: "Faster onboarding process" },
        { value: "50%", label: "Less time on attendance tracking" },
      ]}
      useCases={[
        { title: "Tech Startups", description: "Manage a fast-growing team with flexible leave policies, remote attendance, and equity-based compensation tracking.", icon: Building2 },
        { title: "Manufacturing", description: "Handle shift rotations, overtime rules, and compliance-heavy payroll for large blue-collar workforces.", icon: Shield },
        { title: "Education", description: "Manage faculty contracts, sabbaticals, and semester-based attendance with custom academic calendars.", icon: GraduationCap },
        { title: "Healthcare", description: "Track certifications, manage rotating shifts for nurses and doctors, and ensure license compliance.", icon: Heart },
        { title: "Retail Chains", description: "Multi-location attendance, part-time scheduling, and commission-based payroll calculations.", icon: Briefcase },
        { title: "Professional Services", description: "Track billable hours, manage project-based teams, and automate consultant onboarding.", icon: Award },
      ]}
      benefits={[
        "Interactive org chart visualization",
        "Employee self-service portal",
        "360° performance reviews",
        "Structured onboarding checklists",
        "Automated payroll with zero errors",
        "Festival bonus automation",
        "Multi-department management",
        "Custom approval hierarchies",
        "Training & certification tracking",
        "Real-time workforce analytics",
      ]}
      faqs={[
        { q: "Can I customize leave policies per department?", a: "Yes. Create unlimited leave types with department-specific quotas, carry-forward rules, and approval chains." },
        { q: "How does the org chart work?", a: "The org chart is auto-generated from employee reporting relationships. Click any node to drill into team composition, open positions, and employee details." },
        { q: "How do 360° reviews work?", a: "Configure review cycles where employees receive feedback from managers, peers, subordinates, and self-assessments. Results are aggregated into comprehensive performance reports." },
        { q: "How does shift management work?", a: "Create rotating or fixed shifts with configurable grace periods. Late arrivals are auto-calculated and linked to attendance records for payroll deductions." },
        { q: "Can employees access their own data?", a: "Yes. The Employee Self-Service portal gives team members access to their profile, payslips, leave balances, document requests, and company announcements." },
      ]}
    />
  );
}
