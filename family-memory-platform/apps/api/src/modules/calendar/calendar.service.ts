import { Injectable } from '@nestjs/common';
import type { CalendarEventSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly notifications: NotificationsService,
  ) {}

  async listEvents(from?: string, to?: string) {
    const snapshot = this.workspaceContext.getSnapshot();
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date(new Date().getFullYear() + 1, 11, 31);

    const persons = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        ...(snapshot.workspaceId ? { workspaceId: snapshot.workspaceId } : {}),
        OR: [
          { birthDate: { gte: fromDate, lte: toDate } },
          { deathDate: { gte: fromDate, lte: toDate } },
        ],
      },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthDate: true,
        deathDate: true,
      },
    });

    const genealogyEvents = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        ...(snapshot.workspaceId ? { workspaceId: snapshot.workspaceId } : {}),
        date: { not: null, gte: fromDate, lte: toDate },
        type: { in: ['MARRIAGE', 'BIRTH', 'DEATH', 'CUSTOM'] },
      },
      select: { id: true, type: true, description: true, date: true, personId: true },
    });

    const events: CalendarEventSummary[] = [];

    for (const person of persons) {
      const name = [person.givenName, person.familyName].filter(Boolean).join(' ');
      if (person.birthDate && person.birthDate >= fromDate && person.birthDate <= toDate) {
        events.push({
          id: `birth:${person.id}`,
          kind: 'BIRTH',
          title: `День рождения: ${name}`,
          date: person.birthDate.toISOString(),
          endDate: null,
          personId: person.id,
          eventId: null,
          deepLink: `/persons/${person.id}`,
          allDay: true,
        });
        const anniversary = this.nextAnniversary(person.birthDate, fromDate, toDate);
        if (anniversary) {
          events.push({
            id: `anniversary:${person.id}:${anniversary.getFullYear()}`,
            kind: 'ANNIVERSARY',
            title: `Юбилей: ${name}`,
            date: anniversary.toISOString(),
            endDate: null,
            personId: person.id,
            eventId: null,
            deepLink: `/persons/${person.id}`,
            allDay: true,
          });
        }
      }
      if (person.deathDate && person.deathDate >= fromDate && person.deathDate <= toDate) {
        events.push({
          id: `death:${person.id}`,
          kind: 'DEATH',
          title: `День памяти: ${name}`,
          date: person.deathDate.toISOString(),
          endDate: null,
          personId: person.id,
          eventId: null,
          deepLink: `/persons/${person.id}`,
          allDay: true,
        });
      }
    }

    for (const ev of genealogyEvents) {
      if (!ev.date) continue;
      events.push({
        id: `event:${ev.id}`,
        kind: ev.type === 'MARRIAGE' ? 'MARRIAGE' : ev.type === 'BIRTH' ? 'BIRTH' : ev.type === 'DEATH' ? 'DEATH' : 'CUSTOM',
        title: ev.description ?? ev.type,
        date: ev.date.toISOString(),
        endDate: null,
        personId: ev.personId,
        eventId: ev.id,
        deepLink: ev.personId ? `/persons/${ev.personId}` : `/timeline`,
        allDay: true,
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  async exportIcal(from?: string, to?: string) {
    const events = await this.listEvents(from, to);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Memory Platform//BLOCK1//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const ev of events) {
      const dt = ev.date.slice(0, 10).replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@family-memory-platform`);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`SUMMARY:${this.escapeIcal(ev.title)}`);
      if (ev.deepLink) lines.push(`URL:${ev.deepLink}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  async processDailyRemindersForAll() {
    const members = await this.prisma.workspaceMember.findMany({
      select: { workspaceId: true, userId: true },
    });
    let sent = 0;
    for (const member of members) {
      const result = await this.workspaceContext.run({ workspaceId: member.workspaceId }, () =>
        this.processUpcomingReminders(member.userId),
      );
      sent += result.sent;
    }
    return { members: members.length, sent };
  }

  async processUpcomingReminders(userId: string) {
    const snapshot = this.workspaceContext.getSnapshot();
    if (!snapshot.workspaceId) return { sent: 0 };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const events = await this.listEvents(tomorrow.toISOString(), dayAfter.toISOString());
    let sent = 0;
    for (const ev of events) {
      await this.notifications.deliver({
        workspaceId: snapshot.workspaceId,
        userId,
        source: 'CALENDAR',
        title: 'Напоминание календаря',
        body: ev.title,
        deepLink: ev.deepLink ?? '/calendar',
        sourceId: ev.id,
      });
      sent += 1;
    }
    return { sent };
  }

  private nextAnniversary(birthDate: Date, from: Date, to: Date) {
    const month = birthDate.getUTCMonth();
    const day = birthDate.getUTCDate();
    for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
      const candidate = new Date(Date.UTC(year, month, day));
      if (candidate >= from && candidate <= to && year - birthDate.getUTCFullYear() >= 1) {
        const age = year - birthDate.getUTCFullYear();
        if (age % 5 === 0 || age === 1) return candidate;
      }
    }
    return null;
  }

  private escapeIcal(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
}
