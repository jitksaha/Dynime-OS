import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  color: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  onDragEnd: (result: DropResult) => void;
  renderCard: (item: T, index: number) => React.ReactNode;
  getItemId: (item: T) => string;
}

export default function KanbanBoard<T>({ columns, onDragEnd, renderCard, getItemId }: KanbanBoardProps<T>) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[240px] sm:min-w-[260px] flex-shrink-0">
            <div className={cn("bg-card border border-border rounded-xl border-t-2", column.color)}>
              <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {column.items.length}
                </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-2.5 sm:p-3 space-y-2 min-h-[80px] transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5"
                    )}
                  >
                    {column.items.map((item, index) => (
                      <Draggable key={getItemId(item)} draggableId={getItemId(item)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(snapshot.isDragging && "opacity-80 rotate-1")}
                          >
                            {renderCard(item, index)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
