import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

interface Feature {
  icon: string;
  title: string;
  body: string;
}

interface Step {
  num: number;
  title: string;
  body: string;
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- HERO ─────────────────────────────────────────────── -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-100 via-transparent to-transparent opacity-50"></div>

      <div class="container-app relative pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
        <span class="badge-info mb-6 animate-fade-in">
          🚀 Beta · Now accepting students from CIS
        </span>

        <h1 class="text-4xl sm:text-6xl font-bold tracking-tight text-primary-950 max-w-4xl mx-auto leading-tight animate-slide-up">
          Learning turns into experience.<br>
          Experience turns into a <span class="text-accent-500">job</span>.
        </h1>

        <p class="mt-6 text-lg sm:text-xl text-primary-600 max-w-2xl mx-auto leading-relaxed">
          Solve real micro-tasks from real companies. Get reviewed by senior mentors.
          Build a verified portfolio that recruiters actually trust.
        </p>

        <div class="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <a routerLink="/auth/register" class="btn-accent text-base px-8 py-3.5">
            Start building your portfolio →
          </a>
          <a href="#how" class="btn-secondary text-base px-8 py-3.5">
            How it works
          </a>
        </div>

        <p class="mt-6 text-sm text-primary-500">
          Free to join · No credit card · Tasks from $30
        </p>
      </div>
    </section>

    <!-- PAIN POINT ───────────────────────────────────────── -->
    <section class="py-20 sm:py-24 bg-white border-y border-primary-200">
      <div class="container-app grid sm:grid-cols-3 gap-8 text-center">
        <div>
          <div class="text-5xl font-bold text-danger">−67%</div>
          <p class="mt-2 text-primary-600">Падение entry-level IT-вакансий с 2023 года<br><span class="text-xs">Stanford Digital Economy Lab</span></p>
        </div>
        <div>
          <div class="text-5xl font-bold text-warning">74%</div>
          <p class="mt-2 text-primary-600">Разработчиков говорят, что найти работу сложно<br><span class="text-xs">HackerRank 2025</span></p>
        </div>
        <div>
          <div class="text-5xl font-bold text-accent-500">55%</div>
          <p class="mt-2 text-primary-600">«Entry-level» вакансий требуют 3+ года опыта<br><span class="text-xs">Industry data</span></p>
        </div>
      </div>
      <p class="container-app mt-12 text-center text-2xl font-semibold text-primary-800 max-w-3xl mx-auto">
        Парадокс: компании не нанимают без опыта; опыт получить негде, потому что не нанимают.
        <span class="block mt-2 text-accent-500">KODfolio ломает этот круг.</span>
      </p>
    </section>

    <!-- HOW IT WORKS ─────────────────────────────────────── -->
    <section id="how" class="py-20 sm:py-24">
      <div class="container-app">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-primary-900">How it works</h2>
          <p class="mt-3 text-primary-600 max-w-xl mx-auto">
            Каждая выполненная задача = верифицированная строчка в портфолио.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (step of steps; track step.num) {
            <div class="card p-6 hover:shadow-md transition">
              <div class="w-10 h-10 rounded-lg bg-accent-100 text-accent-600 flex items-center justify-center font-bold text-lg mb-4">
                {{ step.num }}
              </div>
              <h3 class="font-semibold text-primary-900 mb-2">{{ step.title }}</h3>
              <p class="text-sm text-primary-600 leading-relaxed">{{ step.body }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- FOR WHO ──────────────────────────────────────────── -->
    <section class="py-20 sm:py-24 bg-primary-50">
      <div class="container-app">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-primary-900">Для кого KODfolio</h2>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          @for (f of features; track f.title) {
            <div class="card p-8">
              <div class="text-3xl mb-4">{{ f.icon }}</div>
              <h3 class="text-xl font-semibold text-primary-900 mb-2">{{ f.title }}</h3>
              <p class="text-primary-600 leading-relaxed">{{ f.body }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- FINAL CTA ────────────────────────────────────────── -->
    <section class="py-20 sm:py-24">
      <div class="container-app">
        <div class="card bg-gradient-to-br from-primary-900 to-primary-950 text-white p-10 sm:p-16 text-center relative overflow-hidden">
          <div class="absolute -right-20 -top-20 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl"></div>

          <h2 class="text-3xl sm:text-4xl font-bold mb-4 relative">
            Ready to build a portfolio<br>that <span class="text-accent-400">actually gets you hired?</span>
          </h2>
          <p class="text-primary-200 text-lg mb-8 relative">
            Join the platform that turns learning into employment.
          </p>
          <a routerLink="/auth/register" class="btn-accent text-base px-8 py-3.5 relative">
            Create your free account →
          </a>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
  protected readonly steps: Step[] = [
    {
      num: 1,
      title: "Pick a real task",
      body: "Browse tasks from real companies, filter by your stack, difficulty, and budget."
    },
    {
      num: 2,
      title: "Build & submit",
      body: "Code in your own GitHub. Submit a PR link, demo, and short description."
    },
    {
      num: 3,
      title: "Get reviewed",
      body: "Senior mentors evaluate your work on 4 criteria. Detailed feedback included."
    },
    {
      num: 4,
      title: "Get paid + verified",
      body: "Company approves → you get paid via escrow + verified portfolio entry forever."
    }
  ];

  protected readonly features: Feature[] = [
    {
      icon: "🎓",
      title: "For students",
      body: "Stop searching for experience. Solve real tasks, get expert feedback, and build a portfolio that proves you can ship."
    },
    {
      icon: "🏢",
      title: "For companies",
      body: "Test candidates on actual problems before hiring. Get small features done by vetted talent. Pay only for results."
    },
    {
      icon: "🛠",
      title: "For mentors",
      body: "Earn money for code reviews. Build your reputation. Help shape the next generation of engineers."
    }
  ];
}
