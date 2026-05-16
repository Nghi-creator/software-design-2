import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { CardGridSkeleton, EmptyState, Notice } from "../../components/State";
import { WorkshopCard } from "../../components/WorkshopCard";
import {
  cardClass,
  focusClass,
  linkButtonClass,
} from "../../components/styles";
import {
  defaultWorkshopFilters,
  filterAndSortWorkshops,
} from "../../lib/workshopCatalog";
import {
  getStoredRegistrations,
  subscribeToRegistrationChanges,
} from "../../lib/registrationStore";
import { useWorkshopCatalog } from "../../lib/useWorkshopCatalog";
import type {
  SessionUser,
  WorkshopAvailabilityFilter,
  WorkshopFilters,
  WorkshopRegistrationFilter,
  WorkshopSortBy,
} from "../../types";

export function WorkshopsPage({ user }: { user: SessionUser | null }) {
  const { error, isLoading, source, workshops } = useWorkshopCatalog();
  const [filters, setFilters] = useState<WorkshopFilters>(
    defaultWorkshopFilters,
  );
  const [registeredWorkshopIds, setRegisteredWorkshopIds] = useState(
    () => new Set<string>(),
  );
  const filteredWorkshops = useMemo(
    () => filterAndSortWorkshops(workshops, filters, registeredWorkshopIds),
    [filters, registeredWorkshopIds, workshops],
  );
  const hasDateRangeFilter = Boolean(filters.startDate || filters.endDate);

  useEffect(() => {
    if (!user || user.role !== "STUDENT") {
      setRegisteredWorkshopIds(new Set());
      return undefined;
    }

    const userId = user.id;

    function refreshRegisteredWorkshops() {
      const confirmedWorkshopIds = getStoredRegistrations(userId)
        .filter((registration) => registration.status === "CONFIRMED")
        .map((registration) => registration.workshopId);

      setRegisteredWorkshopIds(new Set(confirmedWorkshopIds));
    }

    refreshRegisteredWorkshops();
    return subscribeToRegistrationChanges(refreshRegisteredWorkshops);
  }, [user]);

  function updateFilter<Value extends keyof WorkshopFilters>(
    key: Value,
    value: WorkshopFilters[Value],
  ) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Unihub"
        title="Browse workshops"
        description="Search the event-week schedule by topic, speaker, room, day, availability and fee."
      />
      {error ? <Notice tone="warning" message={error} /> : null}
      <section
        className={`${cardClass} grid gap-theme-md p-theme-md md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]`}
        aria-label="Workshop filters"
      >
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Search
          <input
            className={fieldClass}
            type="search"
            placeholder="Speaker, topic, room..."
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
          />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          From
          <input
            className={fieldClass}
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onInput={(event) =>
              updateFilter("startDate", event.currentTarget.value)
            }
            onChange={(event) => updateFilter("startDate", event.target.value)}
          />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          To
          <input
            className={fieldClass}
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onInput={(event) =>
              updateFilter("endDate", event.currentTarget.value)
            }
            onChange={(event) => updateFilter("endDate", event.target.value)}
          />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Availability
          <select
            className={fieldClass}
            value={filters.availability}
            onChange={(event) =>
              updateFilter(
                "availability",
                event.target.value as WorkshopAvailabilityFilter,
              )
            }
          >
            <option value="all">Any availability</option>
            <option value="hasSeats">Has seats</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Registration
          <select
            className={fieldClass}
            value={filters.registration}
            onChange={(event) =>
              updateFilter(
                "registration",
                event.target.value as WorkshopRegistrationFilter,
              )
            }
          >
            <option value="all">All workshops</option>
            <option value="registered">Registered</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Sort
          <select
            className={fieldClass}
            value={filters.sortBy}
            onChange={(event) =>
              updateFilter("sortBy", event.target.value as WorkshopSortBy)
            }
          >
            <option value="startTime">Time</option>
            <option value="title">Title</option>
            <option value="speaker">Speaker</option>
            <option value="price">Fee</option>
            <option value="seatsRemaining">Seats remaining</option>
          </select>
        </label>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-theme-sm">
        <p className="text-sm font-bold text-text-secondary">
          Showing {filteredWorkshops.length} of {workshops.length} workshops
          {source === "api" ? " with live seat counts." : " from seed data."}
        </p>
        <button
          className={linkButtonClass}
          type="button"
          onClick={() => setFilters(defaultWorkshopFilters)}
        >
          Reset filters
        </button>
      </div>
      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <>
          {filteredWorkshops.length === 0 && !hasDateRangeFilter ? (
            <EmptyState
              title={
                workshops.length === 0
                  ? "No workshops yet"
                  : "No workshops match these filters"
              }
              message={
                workshops.length === 0
                  ? "The schedule is empty right now. Check back after organizers publish workshops."
                  : "Try a broader search, another date range, or a different registration, fee and availability filter."
              }
            />
          ) : null}
          <section className="grid gap-theme-md md:grid-cols-3">
            {filteredWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} user={user} workshop={workshop} />
            ))}
          </section>
        </>
      )}
    </>
  );
}

const fieldClass = `min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none ${focusClass}`;
