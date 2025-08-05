import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { PageLoader } from '@/components/ui/loading';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Memuat aplikasi..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {breadcrumbs && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                     <React.Fragment key={index}>
                       <BreadcrumbItem>
                         {crumb.href ? (
                           <BreadcrumbLink href={crumb.href}>
                             {crumb.label}
                           </BreadcrumbLink>
                         ) : (
                           <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                         )}
                       </BreadcrumbItem>
                       {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                     </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 bg-muted/20">
          {title && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}