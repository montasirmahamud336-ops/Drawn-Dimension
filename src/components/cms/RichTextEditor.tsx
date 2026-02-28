import { type ChangeEventHandler, type ClipboardEventHandler, useEffect, useRef } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Redo2, Type, Underline, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/components/shared/richText";

type HeadingLevel = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "h7";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const headingOptions: Array<{ value: HeadingLevel; label: string }> = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "H1" },
  { value: "h2", label: "H2" },
  { value: "h3", label: "H3" },
  { value: "h4", label: "H4" },
  { value: "h5", label: "H5" },
  { value: "h6", label: "H6" },
  { value: "h7", label: "H7" },
];

const fontOptions: Array<{ value: string; label: string }> = [
  { value: "Inter", label: "Inter" },
  { value: "'Plus Jakarta Sans', Inter, sans-serif", label: "Plus Jakarta Sans" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

const RichTextEditor = ({ value, onChange, placeholder = "Write content...", className = "" }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLSelectElement | null>(null);
  const fontRef = useRef<HTMLSelectElement | null>(null);

  const syncEditorValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sanitized = sanitizeRichHtml(editor.innerHTML);
    if (editor.innerHTML !== sanitized) {
      editor.innerHTML = sanitized;
    }
    onChange(sanitized);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    const sanitized = sanitizeRichHtml(value);
    if (editor.innerHTML !== sanitized) {
      editor.innerHTML = sanitized;
    }
  }, [value]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue ?? "");
    syncEditorValue();
  };

  const applyFontFamily = (fontFamily: string) => {
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontName", false, fontFamily);
    if (fontRef.current) {
      fontRef.current.value = fontFamily;
    }
    syncEditorValue();
  };

  const applyHeading = (heading: HeadingLevel) => {
    focusEditor();
    if (heading === "h7") {
      document.execCommand("formatBlock", false, "p");
      const selection = window.getSelection();
      if (selection?.anchorNode) {
        const element =
          selection.anchorNode.nodeType === Node.TEXT_NODE
            ? selection.anchorNode.parentElement
            : (selection.anchorNode as HTMLElement);
        const paragraph = element?.closest("p");
        if (paragraph) {
          paragraph.setAttribute("data-heading-level", "7");
          paragraph.style.fontSize = "0.82rem";
          paragraph.style.fontWeight = "700";
          paragraph.style.lineHeight = "1.25";
        }
      }
    } else {
      document.execCommand("formatBlock", false, heading === "p" ? "p" : heading);
      const selection = window.getSelection();
      if (selection?.anchorNode) {
        const element =
          selection.anchorNode.nodeType === Node.TEXT_NODE
            ? selection.anchorNode.parentElement
            : (selection.anchorNode as HTMLElement);
        const paragraph = element?.closest("p[data-heading-level]");
        if (paragraph) {
          paragraph.removeAttribute("data-heading-level");
          paragraph.style.removeProperty("font-size");
          paragraph.style.removeProperty("font-weight");
          paragraph.style.removeProperty("line-height");
        }
      }
    }
    if (headingRef.current) {
      headingRef.current.value = heading;
    }
    syncEditorValue();
  };

  const insertPlainText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("");
    if (lines) {
      document.execCommand("insertHTML", false, lines);
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (event) => {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (html) {
      event.preventDefault();
      document.execCommand("insertHTML", false, html);
      syncEditorValue();
      return;
    }
    if (text) {
      event.preventDefault();
      insertPlainText(text);
      syncEditorValue();
    }
  };

  const handleColorChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const color = event.target.value;
    if (!color) return;
    runCommand("foreColor", color);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/50 p-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2 py-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <select
            ref={fontRef}
            defaultValue={fontOptions[0].value}
            onChange={(event) => applyFontFamily(event.target.value)}
            className="h-8 min-w-[170px] rounded-md border border-input bg-background px-2 text-xs sm:text-sm"
            title="Font Family"
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <select
          ref={headingRef}
          defaultValue="p"
          onChange={(event) => applyHeading(event.target.value as HeadingLevel)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs sm:text-sm"
          title="Heading"
        >
          {headingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("underline")} title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("insertUnorderedList")} title="Bullet List">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("insertOrderedList")} title="Number List">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("justifyLeft")} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("justifyCenter")} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("justifyRight")} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("undo")} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => runCommand("redo")} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          Text Color
          <input type="color" className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-1" onChange={handleColorChange} />
        </label>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/60" data-lenis-prevent>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditorValue}
          onBlur={syncEditorValue}
          onPaste={handlePaste}
          className="cms-rich-editor h-[420px] min-h-[280px] max-h-[60vh] overflow-y-auto overscroll-contain p-4 text-sm leading-relaxed outline-none"
          data-placeholder={placeholder}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Supports fonts, headings (H1-H7), alignment, colors, lists, and rich paste. Content box is scrollable for long text.
      </p>
    </div>
  );
};

export default RichTextEditor;
