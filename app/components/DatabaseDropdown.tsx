'use client';

import { useState } from 'react';
import {
  Database,
  ChevronDown,
  Check,
  X,
  Ban,
  Paperclip,
} from 'lucide-react';

interface DatabaseFile {
  id: string;
  file_name: string;
  created_at: string;
}

interface DatabaseDropdownProps {
  databases: DatabaseFile[];
  activeDatabaseId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpload: () => void; // NEW
}

export default function DatabaseDropdown({
  databases,
  activeDatabaseId,
  onSelect,
  onDelete,
  onUpload,
}: DatabaseDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFileName = databases.find(
    (db) => db.id === activeDatabaseId
  )?.file_name;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/70"
      >
        <Database className="h-3.5 w-3.5" />
        <span className="font-mono max-w-[160px] truncate">
          {activeFileName ?? 'No database selected'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute bottom-full left-0 z-20 mb-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            {/* No database */}
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted"
            >
              <Ban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span
                className={`flex-1 text-xs ${
                  activeDatabaseId === null
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                No database
              </span>
              {activeDatabaseId === null && (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              )}
            </button>

            {databases.length > 0 && (
              <div className="my-1 border-t border-border" />
            )}

            {databases.map((db) => (
              <div
                key={db.id}
                className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(db.id);
                    setIsOpen(false);
                  }}
                  className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                >
                  <span
                    className={`truncate font-mono text-xs ${
                      db.id === activeDatabaseId
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {db.file_name}
                  </span>

                  {db.id === activeDatabaseId && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(db.id);
                  }}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  title="Delete this file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Upload option */}
            <div className="my-1 border-t border-border" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onUpload();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Upload Database
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}