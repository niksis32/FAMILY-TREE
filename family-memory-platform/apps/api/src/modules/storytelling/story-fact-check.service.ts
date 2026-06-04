import { Injectable } from '@nestjs/common';
import type { StoryClaim, StoryDraftDto } from '@family/shared';

export type PersonFactRecord = {
  id: string;
  givenName?: string | null;
  patronymic?: string | null;
  familyName?: string | null;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  isLiving?: boolean | null;
};

export type EventFactRecord = {
  id: string;
  title?: string | null;
  type?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  date?: string | null;
  sortDate?: string | null;
};

export type StoryFactCheckIssue = {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  personId?: string;
  field?: string;
};

export type StoryFactCheckResult = {
  score: number;
  passed: boolean;
  issues: StoryFactCheckIssue[];
  warnings: StoryDraftDto['warnings'];
};

const BIRTH_HINTS = /(родил(?:ся|ась)|рожд(?:ение|ения)|born|birth)/i;
const DEATH_HINTS = /(умер(?:ла)?|скончал(?:ся|ась)|погиб(?:ла)?|died|death|passed away)/i;
const YEAR_RE = /\b(1[6-9]\d{2}|20\d{2})\b/g;

@Injectable()
export class StoryFactCheckService {
  checkNarrative(
    narrative: string,
    context: { persons?: PersonFactRecord[]; events?: EventFactRecord[] },
  ): StoryFactCheckResult {
    const text = (narrative ?? '').trim();
    const lowered = text.toLowerCase();
    const issues: StoryFactCheckIssue[] = [];

    if (!text) {
      return {
        score: 0,
        passed: false,
        issues: [{ code: 'empty_narrative', severity: 'warning', message: 'Текст рассказа пустой.' }],
        warnings: [{ kind: 'missing_source', message: 'Текст рассказа пустой — fact-check невозможен.' }],
      };
    }

    const narrativeYears = new Set(Array.from(text.matchAll(YEAR_RE), (m) => Number(m[1])));
    const persons = context.persons ?? [];
    const events = context.events ?? [];

    for (const person of persons) {
      const display = this.personDisplayName(person);
      const given = (person.givenName ?? '').trim();
      const family = (person.familyName ?? '').trim();
      const birthYear = this.yearFromValue(person.birthDate);
      const deathYear = this.yearFromValue(person.deathDate);

      if (given && !this.containsToken(lowered, given)) {
        issues.push({
          code: 'missing_given_name',
          severity: 'warning',
          message: `В тексте не найдено имя из Person: «${given}» (${display}).`,
          personId: person.id,
          field: 'givenName',
        });
      }
      if (family && !this.containsToken(lowered, family)) {
        issues.push({
          code: 'missing_family_name',
          severity: 'info',
          message: `В тексте не найдена фамилия из Person: «${family}» (${display}).`,
          personId: person.id,
          field: 'familyName',
        });
      }

      if (birthYear != null) {
        const birthContextYears = this.yearsNearPattern(text, BIRTH_HINTS);
        const conflicting = [...birthContextYears].filter((y) => y !== birthYear);
        if (conflicting.length) {
          issues.push({
            code: 'birth_year_conflict',
            severity: 'error',
            message: `Конфликт даты рождения для ${display}: в Person ${birthYear}, в тексте рядом с «рожд*»: ${conflicting.join(', ')}.`,
            personId: person.id,
            field: 'birthDate',
          });
        } else if (!narrativeYears.has(birthYear) && BIRTH_HINTS.test(text)) {
          issues.push({
            code: 'missing_birth_year_in_narrative',
            severity: 'info',
            message: `У ${display} в Person указан год рождения ${birthYear}, но он не найден в тексте.`,
            personId: person.id,
            field: 'birthDate',
          });
        }
      }

      if (person.isLiving === true && DEATH_HINTS.test(text)) {
        issues.push({
          code: 'living_person_death_language',
          severity: 'error',
          message: `Person ${display} помечен как living, но в тексте есть формулировки о смерти.`,
          personId: person.id,
          field: 'isLiving',
        });
      }

      if (deathYear != null) {
        const deathContextYears = this.yearsNearPattern(text, DEATH_HINTS);
        const conflicting = [...deathContextYears].filter((y) => y !== deathYear);
        if (conflicting.length) {
          issues.push({
            code: 'death_year_conflict',
            severity: 'error',
            message: `Конфликт даты смерти для ${display}: в Person ${deathYear}, в тексте рядом с «умер*»: ${conflicting.join(', ')}.`,
            personId: person.id,
            field: 'deathDate',
          });
        } else if (!narrativeYears.has(deathYear) && DEATH_HINTS.test(text)) {
          issues.push({
            code: 'missing_death_year_in_narrative',
            severity: 'info',
            message: `У ${display} в Person указан год смерти ${deathYear}, но он не найден в тексте.`,
            personId: person.id,
            field: 'deathDate',
          });
        }
      } else if (person.isLiving === false && birthYear != null && narrativeYears.size) {
        const upper = Math.max(...narrativeYears);
        if (upper < birthYear) {
          issues.push({
            code: 'timeline_year_before_birth',
            severity: 'warning',
            message: `В тексте есть год ${upper}, который раньше рождения ${display} (${birthYear}).`,
            personId: person.id,
            field: 'birthDate',
          });
        }
      }
    }

    const knownEventYears = new Set<number>();
    for (const event of events) {
      for (const key of ['dateFrom', 'dateTo', 'date', 'sortDate'] as const) {
        const year = this.yearFromValue(event[key]);
        if (year != null) knownEventYears.add(year);
      }
    }

    if (knownEventYears.size && narrativeYears.size) {
      const unknown = [...narrativeYears].filter((y) => !knownEventYears.has(y)).sort((a, b) => a - b);
      if (unknown.length >= 3) {
        issues.push({
          code: 'unknown_timeline_years',
          severity: 'warning',
          message: `В тексте есть годы, которых нет в timeline/events: ${unknown.slice(0, 8).join(', ')}.`,
          field: 'timeline',
        });
      }
    }

    const score = this.scoreFromIssues(issues);
    const passed = !issues.some((i) => i.severity === 'error');
    const warnings: StoryDraftDto['warnings'] = issues
      .filter((i) => i.severity === 'error' || i.severity === 'warning')
      .map((i) => this.issueToWarning(i));

    return { score, passed, issues, warnings };
  }

  mergeAiDataWithFactCheck(
    aiData: {
      narrative?: string;
      paragraphs?: unknown;
      claims?: StoryClaim[];
      warnings?: StoryDraftDto['warnings'];
      uncertaintyScore?: number;
      status?: string;
      feature?: string;
      message?: string;
      factCheck?: StoryFactCheckResult;
    },
    factCheck: StoryFactCheckResult,
  ) {
    const existingWarnings = Array.isArray(aiData.warnings) ? aiData.warnings : [];
    const mergedWarnings = this.dedupeWarnings([...existingWarnings, ...factCheck.warnings]);
    const aiUncertainty = typeof aiData.uncertaintyScore === 'number' ? aiData.uncertaintyScore : 0;
    const factUncertainty = 1 - factCheck.score;

    return {
      ...aiData,
      warnings: mergedWarnings,
      uncertaintyScore: Math.max(aiUncertainty, factUncertainty),
      factCheck,
      claims: this.applyFactCheckToClaims(Array.isArray(aiData.claims) ? aiData.claims : [], factCheck),
    };
  }

  private applyFactCheckToClaims(claims: StoryClaim[], result: StoryFactCheckResult): StoryClaim[] {
    if (!result.issues.length) return claims;
    const note = result.issues
      .slice(0, 4)
      .map((i) => i.message)
      .join('; ');
    return claims.map((claim) =>
      claim.isAssumption
        ? {
            ...claim,
            uncertainty: Math.max(claim.uncertainty ?? 0, 1 - result.score),
            uncertaintyNote: claim.uncertaintyNote ?? note.slice(0, 240),
          }
        : claim,
    );
  }

  private dedupeWarnings(warnings: StoryDraftDto['warnings']) {
    const seen = new Set<string>();
    return warnings.filter((w) => {
      const key = `${w.kind}:${w.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private issueToWarning(issue: StoryFactCheckIssue): StoryDraftDto['warnings'][number] {
    if (issue.severity === 'info') {
      return { kind: 'uncertainty', message: issue.message };
    }
    if (issue.code === 'missing_birth_year_in_narrative' || issue.code === 'missing_death_year_in_narrative') {
      return { kind: 'assumption', message: issue.message };
    }
    return { kind: 'fact_mismatch', message: issue.message };
  }

  private scoreFromIssues(issues: StoryFactCheckIssue[]): number {
    let score = 1;
    for (const issue of issues) {
      if (issue.severity === 'error') score -= 0.25;
      else if (issue.severity === 'warning') score -= 0.1;
      else score -= 0.05;
    }
    return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
  }

  private personDisplayName(person: PersonFactRecord): string {
    return (
      [person.givenName, person.patronymic, person.familyName]
        .map((v) => (v ?? '').trim())
        .filter(Boolean)
        .join(' ') || 'Персона'
    );
  }

  private containsToken(haystack: string, token: string): boolean {
    const normalized = token.trim().toLowerCase();
    if (normalized.length < 2) return true;
    return haystack.includes(normalized);
  }

  private yearFromValue(value: Date | string | null | undefined): number | null {
    if (value == null) return null;
    const text = value instanceof Date ? value.toISOString() : String(value);
    const match = text.match(YEAR_RE);
    return match ? Number(match[0]) : null;
  }

  private yearsNearPattern(text: string, pattern: RegExp): Set<number> {
    const years = new Set<number>();
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
      const index = match.index ?? 0;
      const window = text.slice(Math.max(0, index - 40), Math.min(text.length, index + match[0].length + 40));
      for (const yearMatch of window.matchAll(YEAR_RE)) {
        years.add(Number(yearMatch[1]));
      }
    }
    return years;
  }
}
