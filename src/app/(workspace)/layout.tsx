import React from "react";
import WorkspaceProvider from "@/components/WorkspaceProvider";
import WorkspaceShell from "@/components/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
