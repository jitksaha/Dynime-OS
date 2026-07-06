import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedSecurity } from "@/components/illustrations";
import {
  FileText, FolderOpen, Share2, Clock, Lock, Search,
  Building2, Globe, Shield, Briefcase, Heart, BarChart3,
} from "lucide-react";

export default function DocumentsFeature() {
  return (
    <FeaturePageLayout
      title="Document Management"
      subtitle="Files & Documents"
      description="Centralize all your business documents. Store, organize, share, and collaborate on files with enterprise-grade security."
      icon={FileText}
      gradient="bg-gradient-to-br from-slate-500 via-gray-500 to-zinc-600"
      heroIllustration={<AnimatedSecurity />}
      features={[
        { title: "Centralized Storage", description: "One secure location for all company documents with folder organization.", icon: FolderOpen },
        { title: "Version Control", description: "Track every change with automatic versioning and the ability to restore previous versions.", icon: Clock },
        { title: "Document Sharing", description: "Share documents internally or externally with granular permission controls.", icon: Share2 },
        { title: "Full-Text Search", description: "Find any document instantly with powerful search across file names and content.", icon: Search },
        { title: "Access Control", description: "Role-based permissions ensure sensitive documents are only accessible to authorized users.", icon: Lock },
        { title: "File Types Support", description: "Support for PDFs, spreadsheets, presentations, images, and 50+ file formats.", icon: FileText },
      ]}
      detailSections={[
        {
          id: "storage",
          label: "Smart Storage",
          icon: FolderOpen,
          color: "hsl(210,60%,50%)",
          title: "Organize files the way your team thinks",
          description: "Nested folder structures, tagging, and metadata make it easy to organize any volume of documents. Smart filters and saved views put frequently needed files one click away.",
          points: [
            "Nested folders with unlimited depth",
            "Custom tags & metadata fields",
            "Saved views & quick filters",
            "Bulk upload with drag-and-drop",
            "Storage usage analytics per department",
          ],
        },
        {
          id: "security",
          label: "Security & Compliance",
          icon: Lock,
          color: "hsl(0,72%,50%)",
          title: "Enterprise-grade document security",
          description: "Role-based access, audit trails, and encryption at rest ensure your sensitive documents are protected. Meet compliance requirements with automated retention policies.",
          points: [
            "Role-based access controls",
            "Full audit trail for every document",
            "Encryption at rest & in transit",
            "Document retention policies",
            "External sharing with expiry links",
          ],
        },
        {
          id: "collaboration",
          label: "Team Collaboration",
          icon: Share2,
          color: "hsl(142,71%,45%)",
          title: "Collaborate on documents seamlessly",
          description: "Share files internally or externally with granular permissions. Comment threads, approval workflows, and notification ensure everyone stays in sync.",
          points: [
            "Internal & external sharing with permissions",
            "Comment threads on documents",
            "Approval workflows for document review",
            "Email notifications on changes",
            "Download tracking & analytics",
          ],
        },
      ]}
      stats={[
        { value: "90%", label: "Faster document retrieval" },
        { value: "50+", label: "File formats supported" },
        { value: "100%", label: "Audit trail coverage" },
        { value: "3x", label: "Faster document approvals" },
      ]}
      useCases={[
        { title: "Legal Teams", description: "Contract management, NDA tracking, and compliance documentation with version control.", icon: Shield },
        { title: "HR Departments", description: "Employee documents, policy manuals, and onboarding materials in one place.", icon: Building2 },
        { title: "Finance", description: "Invoice storage, tax documents, and audit-ready financial records.", icon: BarChart3 },
        { title: "Healthcare", description: "Patient records, compliance documents, and medical procedure manuals.", icon: Heart },
        { title: "Education", description: "Course materials, research papers, and student records with access controls.", icon: Globe },
        { title: "Consulting", description: "Client deliverables, proposals, and project documentation organized by engagement.", icon: Briefcase },
      ]}
      benefits={[
        "Eliminate document chaos",
        "Instant full-text search",
        "Automatic version history",
        "Granular access controls",
        "Secure external sharing",
        "50+ file formats supported",
        "Bulk upload & organize",
        "Audit trail for compliance",
        "Custom metadata & tags",
        "Department-level organization",
      ]}
      faqs={[
        { q: "What file types are supported?", a: "We support 50+ file formats including PDF, Word, Excel, PowerPoint, images (JPG, PNG, SVG), videos, and more." },
        { q: "Is there a storage limit?", a: "Storage limits depend on your plan tier. All plans include generous storage with additional capacity available as add-ons." },
        { q: "Can I share files with external users?", a: "Yes. Generate secure sharing links with optional password protection, expiry dates, and download limits." },
        { q: "How does version control work?", a: "Every file upload creates a new version. You can view the full version history, compare changes, and restore any previous version with one click." },
      ]}
    />
  );
}
