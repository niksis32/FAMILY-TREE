'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui';
import { formatPersonLabel, type PersonNameFields } from '@/lib/person-display';
import { cn } from '@/lib/utils';

export type PersonSearchOption = PersonNameFields & {
  birthDate?: string | null;
};

type PersonSearchComboboxProps = {
  persons: PersonSearchOption[];
  value: string;
  onChange: (personId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function personMatches(person: PersonSearchOption, query: string) {
  if (!query) return true;
  const label = formatPersonLabel(person).toLowerCase();
  return label.includes(query) || person.id.toLowerCase().includes(query);
}

function personBirthYear(person: PersonSearchOption) {
  return person.birthDate?.slice(0, 4) ?? '';
}

export function PersonSearchCombobox({
  persons,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
}: PersonSearchComboboxProps) {
  const t = useTranslations('personSearchCombobox');
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedPerson = useMemo(
    () => persons.find((person) => person.id === value) ?? null,
    [persons, value],
  );

  const filteredPersons = useMemo(
    () => persons.filter((person) => personMatches(person, normalizeQuery(query))),
    [persons, query],
  );

  const inputValue = open ? query : selectedPerson ? formatPersonLabel(selectedPerson) : query;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function selectPerson(personId: string) {
    onChange(personId);
    setOpen(false);
    setQuery('');
  }

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    setQuery(selectedPerson ? formatPersonLabel(selectedPerson) : '');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredPersons.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const person = filteredPersons[activeIndex];
      if (person) selectPerson(person.id);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={inputValue}
        placeholder={placeholder ?? t('searchPlaceholder')}
        disabled={disabled}
        onFocus={handleFocus}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
        onKeyDown={handleKeyDown}
      />

      {open && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white py-1 shadow-lg dark:bg-slate-950"
        >
          {filteredPersons.length === 0 ? (
            <li className="px-4 py-3 text-sm text-stone-500 dark:text-slate-400">{t('noMatches')}</li>
          ) : (
            filteredPersons.map((person, index) => {
              const birthYear = personBirthYear(person);
              return (
                <li key={person.id} role="option" aria-selected={person.id === value}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col px-4 py-2 text-left text-sm transition',
                      index === activeIndex
                        ? 'bg-family-accent/15 text-family-primary dark:text-family-accent'
                        : 'hover:bg-stone-50 dark:hover:bg-slate-900',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPerson(person.id)}
                  >
                    <span className="font-medium">{formatPersonLabel(person)}</span>
                    {birthYear ? (
                      <span className="text-xs text-stone-500 dark:text-slate-400">{birthYear}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
