import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../core/services/auth.service";
import { ProfileService } from "../../core/services/profile.service";
import { SkillsService } from "../../core/services/skills.service";
import { ToastService } from "../../core/services/toast.service";
import { Skill } from "../../core/models/user.model";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-profile-edit",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-primary-900">My profile</h1>
        <p class="text-primary-600 mt-1">Keep this up-to-date — companies see it before hiring.</p>
      </div>

      @if (auth.isCompany()) {
        <!-- COMPANY FORM ───────────────────────────────────── -->
        <form [formGroup]="companyForm" (ngSubmit)="saveCompany()" class="card p-6 space-y-4">
          <div>
            <label class="label" for="company_name">Company name</label>
            <input id="company_name" class="input" formControlName="company_name" />
          </div>
          <div>
            <label class="label" for="industry">Industry</label>
            <input id="industry" class="input" formControlName="industry" placeholder="e.g. SaaS / Fintech" />
          </div>
          <div>
            <label class="label" for="website">Website</label>
            <input id="website" type="url" class="input" formControlName="website" placeholder="https://example.com" />
          </div>
          <div>
            <label class="label" for="description">Description</label>
            <textarea id="description" rows="4" class="input" formControlName="description"
                      placeholder="Что делает ваша компания?"></textarea>
          </div>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) { <app-spinner [size]="16" /> }
            <span>Save changes</span>
          </button>
        </form>
      } @else {
        <!-- STUDENT / MENTOR FORM ──────────────────────────── -->
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="card p-6 space-y-4">
          <div>
            <label class="label" for="full_name">Full name</label>
            <input id="full_name" class="input" formControlName="full_name" />
          </div>
          <div>
            <label class="label" for="bio">Bio</label>
            <textarea id="bio" rows="3" class="input" formControlName="bio"
                      placeholder="Кратко о себе"></textarea>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="experience_years">Experience (years)</label>
              <input id="experience_years" type="number" min="0" max="50" class="input"
                     formControlName="experience_years" />
            </div>
            <div>
              <label class="label" for="github_username">GitHub username</label>
              <input id="github_username" class="input" formControlName="github_username"
                     placeholder="octocat" />
            </div>
          </div>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) { <app-spinner [size]="16" /> }
            <span>Save changes</span>
          </button>
        </form>

        <!-- SKILLS ─────────────────────────────────────────── -->
        <div class="card p-6 space-y-4">
          <h2 class="text-lg font-semibold text-primary-900">Tech stack</h2>

          <!-- Текущие скиллы -->
          <div class="flex flex-wrap gap-2">
            @for (s of mySkills(); track s.skill_id) {
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm">
                <span>{{ s.icon }}</span>
                <span class="font-medium">{{ s.name }}</span>
                <span class="text-xs text-primary-500">·{{ s.proficiency }}/5</span>
                <button type="button"
                        class="text-primary-400 hover:text-danger ml-1"
                        (click)="removeSkill(s.skill_id)"
                        aria-label="Удалить">×</button>
              </span>
            }
            @if (mySkills().length === 0) {
              <p class="text-sm text-primary-500">У вас пока нет скиллов. Добавьте ниже ↓</p>
            }
          </div>

          <!-- Добавить скилл -->
          <div class="flex flex-wrap gap-2 pt-2 border-t border-primary-100">
            <select #skillSelect class="input flex-1 min-w-0">
              <option value="">— выбрать скилл —</option>
              @for (s of availableSkills(); track s.id) {
                <option [value]="s.id">{{ s.icon }} {{ s.name }} ({{ s.category }})</option>
              }
            </select>
            <select #profSelect class="input w-32">
              <option value="3">3 / Mid</option>
              <option value="1">1 / New</option>
              <option value="2">2 / Junior</option>
              <option value="4">4 / Senior</option>
              <option value="5">5 / Expert</option>
            </select>
            <button type="button"
                    class="btn-accent"
                    (click)="addSkill(skillSelect.value, +profSelect.value)"
                    [disabled]="!skillSelect.value">
              + Add
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ProfileEditComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly profileApi = inject(ProfileService);
  private readonly skillsApi = inject(SkillsService);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly allSkills = signal<Skill[]>([]);

  protected readonly profileForm = this.fb.nonNullable.group({
    full_name: ["", [Validators.maxLength(120)]],
    bio: [""],
    experience_years: [0, [Validators.min(0), Validators.max(50)]],
    github_username: [""]
  });

  protected readonly companyForm = this.fb.nonNullable.group({
    company_name: ["", [Validators.required, Validators.maxLength(200)]],
    industry: [""],
    website: [""],
    description: [""]
  });

  ngOnInit(): void {
    // Подгружаем актуальный профиль с бэка
    this.profileApi.getMyProfile().subscribe({
      next: (data) => {
        if (this.auth.isCompany()) {
          const p = data as { company_name: string; industry: string; website: string; description: string };
          this.companyForm.patchValue(p);
        } else {
          const p = data as {
            full_name: string;
            bio: string;
            experience_years: number;
            github_username: string;
          };
          this.profileForm.patchValue(p);
        }
        this.auth.fetchMe().subscribe(); // обновляем signals
      }
    });

    if (!this.auth.isCompany()) {
      this.skillsApi.list().subscribe({
        next: (skills) => this.allSkills.set(skills)
      });
    }
  }

  protected mySkills() {
    return this.auth.user()?.profile?.skills ?? [];
  }

  protected availableSkills(): Skill[] {
    const owned = new Set(this.mySkills().map((s) => s.skill_id));
    return this.allSkills().filter((s) => !owned.has(s.id));
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    this.profileApi.updateMyProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success("Profile saved.");
        this.auth.fetchMe().subscribe();
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(e.error?.error?.message ?? "Не удалось сохранить.");
      }
    });
  }

  protected saveCompany(): void {
    if (this.companyForm.invalid) return;
    this.saving.set(true);
    this.profileApi.updateMyProfile(this.companyForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success("Company info saved.");
        this.auth.fetchMe().subscribe();
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(e.error?.error?.message ?? "Не удалось сохранить.");
      }
    });
  }

  protected addSkill(skillId: string, proficiency: number): void {
    if (!skillId) return;
    this.profileApi.addSkill(skillId, proficiency).subscribe({
      next: () => {
        this.toast.success("Skill added.");
        this.auth.fetchMe().subscribe();
      },
      error: () => this.toast.error("Не удалось добавить скилл.")
    });
  }

  protected removeSkill(skillId: string): void {
    this.profileApi.removeSkill(skillId).subscribe({
      next: () => {
        this.toast.success("Removed.");
        this.auth.fetchMe().subscribe();
      },
      error: () => this.toast.error("Не удалось удалить.")
    });
  }
}
