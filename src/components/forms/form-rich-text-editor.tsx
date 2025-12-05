'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon
} from 'lucide-react';

interface FormRichTextEditorProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  assignedUserIds?: string[];
  assignedUsers?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

export function FormRichTextEditor({
  name,
  label,
  placeholder = 'Start typing...',
  required = false,
  className,
  assignedUserIds,
  assignedUsers
}: FormRichTextEditorProps) {
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <RichTextEditor
          value={field.value || ''}
          onChange={field.onChange}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error?.message as string | undefined}
          className={className}
          assignedUserIds={assignedUserIds}
          assignedUsers={assignedUsers}
        />
      )}
    />
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  assignedUserIds?: string[];
  assignedUsers?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  error,
  className,
  assignedUserIds,
  assignedUsers
}: RichTextEditorProps) {
  // Preload all users for mentions - use ref so items function always has latest value
  const preloadedUsersRef = React.useRef<Array<{ id: string; label: string }>>(
    []
  );

  React.useEffect(() => {
    // Fetch all active users for mentions (including admin and any type)
    const fetchAllUsers = async () => {
      try {
        const res = await fetch('/api/users/all');
        if (res.ok) {
          const data = await res.json();
          const users = (data.users || []).map((user: any) => ({
            id: user.id,
            label: user.name || user.email || user.username || 'Unknown'
          }));
          preloadedUsersRef.current = users;
        } else {
          console.error('Failed to fetch users:', res.statusText);
          // Fallback to assigned users if available
          if (assignedUsers && assignedUsers.length > 0) {
            const users = assignedUsers.map((user) => ({
              id: user.id,
              label: user.name || user.email || 'Unknown'
            }));
            preloadedUsersRef.current = users;
          }
        }
      } catch (error) {
        console.error('Failed to preload users:', error);
        // Fallback to assigned users if available
        if (assignedUsers && assignedUsers.length > 0) {
          const users = assignedUsers.map((user) => ({
            id: user.id,
            label: user.name || user.email || 'Unknown'
          }));
          preloadedUsersRef.current = users;
        }
      }
    };

    fetchAllUsers();
  }, [assignedUsers]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-primary font-medium bg-primary/10 px-1 rounded'
        },
        suggestion: {
          items: ({ query }) => {
            // Use preloaded users and filter client-side
            const users = preloadedUsersRef.current;

            if (!query || query.length === 0) {
              // Show all users when just typing @
              return users;
            }

            // Filter preloaded users based on query (case-insensitive)
            const queryLower = query.toLowerCase();
            return users.filter(
              (user) =>
                user.label.toLowerCase().includes(queryLower) ||
                user.id.toLowerCase().includes(queryLower)
            );
          },
          render: () => {
            let component: HTMLDivElement | null = null;
            let popup: {
              show: () => void;
              hide: () => void;
              setProps: (props: any) => void;
              destroy: () => void;
            } | null = null;

            return {
              onStart: (props: any) => {
                component = document.createElement('div');
                component.className =
                  'bg-popover border rounded-md shadow-sm p-1 min-w-[200px] max-h-[300px] overflow-auto';
                component.style.position = 'fixed';
                component.style.zIndex = '9999';
                component.style.display = 'block';
                component.style.visibility = 'visible';
                component.style.opacity = '1';
                component.style.backgroundColor = 'hsl(var(--popover))';
                component.style.borderColor = 'lab(90.952% 0 -.0000119209)';
                component.style.borderRadius = '0.375rem';

                // Append to body immediately
                document.body.appendChild(component);

                const updatePosition = (
                  rect: DOMRect,
                  comp: HTMLDivElement
                ) => {
                  comp.style.top = `${rect.bottom + window.scrollY + 4}px`;
                  comp.style.left = `${rect.left + window.scrollX}px`;
                };

                popup = {
                  show: () => {
                    const comp = component;
                    if (comp) {
                      try {
                        const rect = props.clientRect();
                        updatePosition(rect, comp);
                        comp.style.display = 'block';
                      } catch (e) {
                        console.error('Error showing popup:', e);
                      }
                    }
                  },
                  hide: () => {
                    const comp = component;
                    if (comp) {
                      comp.style.display = 'none';
                    }
                  },
                  setProps: (newProps: any) => {
                    const comp = component;
                    if (comp) {
                      try {
                        const rect = newProps.getReferenceClientRect();
                        updatePosition(rect, comp);
                      } catch (e) {
                        console.error('Error updating popup position:', e);
                      }
                    }
                  },
                  destroy: () => {
                    if (component && component.parentNode) {
                      component.parentNode.removeChild(component);
                    }
                    component = null;
                    popup = null;
                  }
                };

                // Show immediately with loading state
                component.innerHTML =
                  '<div class="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>';
                popup.show();
              },
              onUpdate: (props: any) => {
                if (!component || !popup) {
                  console.warn('Component or popup not initialized');
                  return;
                }

                if (!props.items || props.items.length === 0) {
                  component.innerHTML =
                    '<div class="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>';
                  popup.setProps({ getReferenceClientRect: props.clientRect });
                  return;
                }

                component.innerHTML = '';

                const currentComp = component;
                if (!currentComp) return;

                props.items.forEach((item: any, index: number) => {
                  const itemElement = document.createElement('div');
                  itemElement.className = cn(
                    'px-2 py-1.5 text-sm cursor-pointer rounded-sm transition-colors',
                    index === props.selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent'
                  );
                  itemElement.textContent =
                    item.label || item.name || item.email || 'Unknown';

                  // Handle click to select - insert mention using editor
                  const handleSelect = () => {
                    try {
                      const selectedItem = props.items[index];
                      if (!selectedItem || !editor) {
                        return;
                      }

                      // Check if props has selectItem method (TipTap's built-in method)
                      if (
                        props.selectItem &&
                        typeof props.selectItem === 'function'
                      ) {
                        props.selectItem(index);
                        return;
                      }

                      // Fallback: manually insert mention if selectItem is not available
                      if (!props.range) {
                        console.warn('Range not available in props', {
                          propsKeys: Object.keys(props)
                        });
                        return;
                      }

                      const { from, to } = props.range;

                      // Delete the @ and query text, then insert mention
                      editor
                        .chain()
                        .focus()
                        .deleteRange({ from, to })
                        .insertContent([
                          {
                            type: 'mention',
                            attrs: {
                              id: selectedItem.id,
                              label:
                                selectedItem.label ||
                                selectedItem.name ||
                                selectedItem.email
                            }
                          },
                          {
                            type: 'text',
                            text: ' '
                          }
                        ])
                        .run();

                      // Hide the popup after insertion
                      if (popup) {
                        popup.hide();
                      }
                    } catch (error) {
                      console.error('Error selecting mention item:', error, {
                        index,
                        item: props.items[index],
                        errorMessage:
                          error instanceof Error ? error.message : String(error)
                      });
                    }
                  };

                  itemElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSelect();
                  });

                  // Also handle mousedown as a fallback
                  itemElement.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSelect();
                  });

                  currentComp.appendChild(itemElement);
                });

                try {
                  popup.setProps({ getReferenceClientRect: props.clientRect });
                  popup.show();
                } catch (e) {
                  console.error('Error updating popup:', e);
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  if (popup) popup.hide();
                  return true;
                }
                if (props.event.key === 'ArrowUp') {
                  props.upHandler();
                  return true;
                }
                if (props.event.key === 'ArrowDown') {
                  props.downHandler();
                  return true;
                }
                if (props.event.key === 'Enter') {
                  props.enterHandler();
                  return true;
                }
                return false;
              },
              onExit: () => {
                if (popup) {
                  popup.destroy();
                }
              }
            };
          }
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
          'prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-ol:my-1',
          'prose-li:my-0 prose-a:text-primary prose-a:underline',
          '[&_span[data-type="mention"]]:text-primary [&_span[data-type="mention"]]:font-medium [&_span[data-type="mention"]]:bg-primary/10 [&_span[data-type="mention"]]:px-1 [&_span[data-type="mention"]]:rounded'
        )
      }
    }
  });

  // Sync editor content with value prop
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          {label}
          {required && <span className='text-destructive ml-1'>*</span>}
        </label>
      )}
      <div
        className={cn(
          'border-input bg-background ring-offset-background rounded-md border',
          'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
          error && 'border-destructive'
        )}
      >
        {/* Toolbar */}
        <div className='border-input flex items-center gap-1 border-b p-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={cn(
              'h-7 w-7 p-0',
              editor.isActive('bold') && 'bg-accent'
            )}
          >
            <Bold className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={cn(
              'h-7 w-7 p-0',
              editor.isActive('italic') && 'bg-accent'
            )}
          >
            <Italic className='h-4 w-4' />
          </Button>
          <div className='bg-border mx-1 h-6 w-px' />
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'h-7 w-7 p-0',
              editor.isActive('bulletList') && 'bg-accent'
            )}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'h-7 w-7 p-0',
              editor.isActive('orderedList') && 'bg-accent'
            )}
          >
            <ListOrdered className='h-4 w-4' />
          </Button>
          <div className='bg-border mx-1 h-6 w-px' />
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={cn(
              'h-7 w-7 p-0',
              editor.isActive('link') && 'bg-accent'
            )}
          >
            <LinkIcon className='h-4 w-4' />
          </Button>
        </div>
        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
      {error && <p className='text-destructive text-sm font-medium'>{error}</p>}
    </div>
  );
}
