import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  // Public landing + (potentially) other public pages — wrapped in MainLayout (header).
  {
    path: "",
    loadComponent: () =>
      import("./layouts/main-layout/main-layout.component").then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: "",
        pathMatch: "full",
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent)
      }
    ]
  },

  // Auth (login/register) — guest only
  {
    path: "auth",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./layouts/auth-layout/auth-layout.component").then(
        (m) => m.AuthLayoutComponent
      ),
    children: [
      { path: "", redirectTo: "login", pathMatch: "full" },
      {
        path: "login",
        loadComponent: () =>
          import("./features/auth/login/login.component").then((m) => m.LoginComponent)
      },
      {
        path: "register",
        loadComponent: () =>
          import("./features/auth/register/register.component").then(
            (m) => m.RegisterComponent
          )
      }
    ]
  },

  // Authenticated area — wrapped in DashboardLayout (sidebar/header for app)
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./layouts/dashboard-layout/dashboard-layout.component").then(
        (m) => m.DashboardLayoutComponent
      ),
    children: [
      { path: "", redirectTo: "student", pathMatch: "full" },
      {
        path: "student",
        canActivate: [roleGuard],
        data: { roles: ["student"] },
        loadComponent: () =>
          import("./features/dashboard/student-dashboard.component").then(
            (m) => m.StudentDashboardComponent
          )
      },
      {
        path: "company",
        canActivate: [roleGuard],
        data: { roles: ["company"] },
        loadComponent: () =>
          import("./features/dashboard/company-dashboard.component").then(
            (m) => m.CompanyDashboardComponent
          )
      },
      {
        path: "mentor",
        canActivate: [roleGuard],
        data: { roles: ["mentor"] },
        loadComponent: () =>
          import("./features/dashboard/mentor-dashboard.component").then(
            (m) => m.MentorDashboardComponent
          )
      },
      {
        path: "admin",
        canActivate: [roleGuard],
        data: { roles: ["admin"] },
        loadComponent: () =>
          import("./features/dashboard/admin-dashboard.component").then(
            (m) => m.AdminDashboardComponent
          )
      },
      {
        path: "profile",
        loadComponent: () =>
          import("./features/profile/profile-edit.component").then(
            (m) => m.ProfileEditComponent
          )
      },
      {
        path: "tasks",
        loadComponent: () =>
          import("./features/tasks/tasks-list.component").then(
            (m) => m.TasksListComponent
          )
      },
      {
        path: "tasks/new",
        canActivate: [roleGuard],
        data: { roles: ["company"] },
        loadComponent: () =>
          import("./features/tasks/task-create.component").then(
            (m) => m.TaskCreateComponent
          )
      },
      {
        path: "tasks/:id",
        loadComponent: () =>
          import("./features/tasks/task-detail.component").then(
            (m) => m.TaskDetailComponent
          )
      },
      {
        path: "tasks/:taskId/submit",
        canActivate: [roleGuard],
        data: { roles: ["student"] },
        loadComponent: () =>
          import("./features/submissions/submission-create.component").then(
            (m) => m.SubmissionCreateComponent
          )
      },
      {
        path: "submissions",
        loadComponent: () =>
          import("./features/submissions/my-submissions.component").then(
            (m) => m.MySubmissionsComponent
          )
      },
      {
        path: "submissions/:id",
        loadComponent: () =>
          import("./features/submissions/submission-detail.component").then(
            (m) => m.SubmissionDetailComponent
          )
      },
      {
        path: "portfolio",
        loadComponent: () =>
          import("./features/portfolio/my-portfolio.component").then(
            (m) => m.MyPortfolioComponent
          )
      },
      {
        path: "payments",
        loadComponent: () =>
          import("./features/payments/payments-history.component").then(
            (m) => m.PaymentsHistoryComponent
          )
      }
    ]
  },

  // Public portfolio — no auth, accessible to recruiters
  {
    path: "portfolio/:userId",
    loadComponent: () =>
      import("./features/portfolio/public-portfolio.component").then(
        (m) => m.PublicPortfolioComponent
      )
  },

  { path: "**", redirectTo: "" }
];
