# Install Drag-and-Drop Dependencies

To enable the Kanban drag-and-drop functionality, install the required packages:

```powershell
cd frontend
npm install @dnd-kit/core @dnd-kit/utilities
```

## Packages Installed

- **@dnd-kit/core**: Core drag-and-drop functionality
- **@dnd-kit/utilities**: Utility functions for transforms

## What Was Implemented

1. **QuotationsList.tsx**: Added DndContext wrapper with drag handlers
2. **KanbanColumn.tsx**: Made columns droppable zones with visual feedback
3. **QuotationCard.tsx**: Made cards draggable with smooth animations

## Features

- Drag quotation cards between status columns
- Visual feedback when hovering over drop zones
- Smooth drag overlay animation
- Optimistic UI updates
- Automatic backend sync on drop
- Error handling with rollback on failure

## Usage

Simply drag any quotation card to a different status column to update its status.
The change will be saved automatically to the backend.
