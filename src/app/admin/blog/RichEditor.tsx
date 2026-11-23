'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import { TableKit } from '@tiptap/extension-table'
import Youtube, { getEmbedUrlFromYoutubeUrl, isValidYoutubeUrl } from '@tiptap/extension-youtube'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import {
  Bold,
  Code,
  Code2,
  Eraser,
  FileCode2,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Video as VideoIcon,
} from 'lucide-react'
import { uploadBlogImage } from '@/lib/ops-api'
import { translateApiError } from '@/lib/api-error'

/**
 * The article editor: what you see is the article as it will be published,
 * and what gets saved is Markdown.
 *
 * Markdown stays the stored format because everything else that writes posts
 * — the daily routines, the skills, the API itself — speaks it. The few
 * things Markdown has no syntax for travel as inline HTML the API's sanitizer
 * lets through: <u>, <mark> and the YouTube embed below. Anything else the
 * editor can produce is plain Markdown.
 */

/** Highlight as <mark>, which the API renders; `==x==` it would print as is. */
const MarkHighlight = Highlight.extend({
  renderMarkdown: (node, h) => `<mark>${h.renderChildren(node)}</mark>`,
  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src: string) => src.toLowerCase().indexOf('<mark>'),
    tokenize(src, _tokens, lexer) {
      const m = /^<mark>([\s\S]+?)<\/mark>/i.exec(src)
      if (!m) return
      return { type: 'highlight', raw: m[0], text: m[1], tokens: lexer.inlineTokens(m[1]) }
    },
  },
})

/**
 * A YouTube video, stored as the embed the API allows: the no-cookie player
 * in a `.video-embed` wrapper that the site's CSS makes responsive.
 */
const VideoEmbed = Youtube.extend({
  renderMarkdown: (node) => {
    const src = getEmbedUrlFromYoutubeUrl({ url: node.attrs?.src ?? '', nocookie: true }) ?? ''
    if (!src) return ''
    // The leading blank line keeps the embed its own block when it sits in a
    // list item; glued to the item's text it would be read back as part of
    // that paragraph and dropped.
    return `\n<div class="video-embed"><iframe src="${src}" width="640" height="360" title="Video de YouTube" allowfullscreen loading="lazy"></iframe></div>`
  },
  markdownTokenizer: {
    name: 'youtube',
    level: 'block',
    start: (src: string) => src.indexOf('<div class="video-embed">'),
    tokenize(src) {
      const m = /^\n?<div class="video-embed">\s*<iframe[^>]*\ssrc="([^"]+)"[^>]*>\s*<\/iframe>\s*<\/div>[ \t]*(?:\n+|$)/.exec(src)
      if (!m) return
      return { type: 'youtube', raw: m[0], src: m[1] }
    },
  },
  parseMarkdown: (token) => ({ type: 'youtube', attrs: { src: token.src as string } }),
}).configure({ nocookie: true, width: 640, height: 360 })

type Panel = null | 'link' | 'youtube' | 'image' | 'alt'

interface RichEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
}

export function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const [source, setSource] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // The last Markdown this editor emitted, so a value echoed back by the
  // parent is not re-parsed (which would move the cursor to the end).
  const emitted = useRef(value)
  // Paste and drop handlers are registered once, so they read the editor
  // through a ref rather than a stale closure.
  const editorRef = useRef<Editor | null>(null)

  const uploadAndInsert = async (editor: Editor, files: File[], pos?: number) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return false
    setError(null)
    setUploading((n) => n + images.length)
    for (const file of images) {
      try {
        const src = await uploadBlogImage(file)
        const alt = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
        const chain = editor.chain().focus()
        if (pos !== undefined) chain.insertContentAt(pos, { type: 'image', attrs: { src, alt } })
        else chain.setImage({ src, alt })
        chain.run()
      } catch (err) {
        setError(translateApiError(err, `No pudimos subir ${file.name}`))
      } finally {
        setUploading((n) => n - 1)
      }
    }
    return true
  }

  const editor = useEditor({
    immediatelyRender: false,
    // The toolbar reflects the selection, so every transaction re-renders.
    // An article is small enough that this is never what makes typing slow.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        // H1 is the post's title; the body starts at H2.
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Markdown,
      Image.configure({ inline: false }),
      MarkHighlight,
      TableKit.configure({ table: { resizable: false } }),
      VideoEmbed,
      Placeholder.configure({ placeholder: placeholder ?? 'Escribí la nota…' }),
      CharacterCount,
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: { class: 'blog-content rte__content', 'aria-label': 'Contenido de la nota' },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? [])
        if (!files.some((f) => f.type.startsWith('image/')) || !editorRef.current) return false
        void uploadAndInsert(editorRef.current, files)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !editorRef.current) return false
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (!files.some((f) => f.type.startsWith('image/'))) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void uploadAndInsert(editorRef.current, files, pos)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown()
      emitted.current = md
      onChange(md)
    },
  })
  editorRef.current = editor

  // A new value from outside (a post loaded after mount, the source view).
  useEffect(() => {
    if (!editor || value === emitted.current) return
    emitted.current = value
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

  const e = editor
  const state = e
    ? {
      heading: ([2, 3, 4] as const).find((level) => e.isActive('heading', { level })) ?? 0,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      table: e.isActive('table'),
      image: e.isActive('image'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      words: e.storage.characterCount.words() as number,
      }
    : null

  if (!editor || !state) {
    return <div className="rte rte--loading" aria-busy="true">Cargando editor…</div>
  }

  const c = () => editor.chain().focus()

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Formato">
        <Group>
          <Tool label="Deshacer (Ctrl+Z)" disabled={source || !state.canUndo} onClick={() => c().undo().run()}><Undo2 /></Tool>
          <Tool label="Rehacer (Ctrl+Shift+Z)" disabled={source || !state.canRedo} onClick={() => c().redo().run()}><Redo2 /></Tool>
        </Group>
        <Group>
          <Tool label="Párrafo" active={!state.heading && !source} disabled={source} onClick={() => c().setParagraph().run()}><Pilcrow /></Tool>
          <Tool label="Título" active={state.heading === 2} disabled={source} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></Tool>
          <Tool label="Subtítulo" active={state.heading === 3} disabled={source} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></Tool>
          <Tool label="Título menor" active={state.heading === 4} disabled={source} onClick={() => c().toggleHeading({ level: 4 }).run()}><Heading4 /></Tool>
        </Group>
        <Group>
          <Tool label="Negrita (Ctrl+B)" active={state.bold} disabled={source} onClick={() => c().toggleBold().run()}><Bold /></Tool>
          <Tool label="Cursiva (Ctrl+I)" active={state.italic} disabled={source} onClick={() => c().toggleItalic().run()}><Italic /></Tool>
          <Tool label="Subrayado (Ctrl+U)" active={state.underline} disabled={source} onClick={() => c().toggleUnderline().run()}><UnderlineIcon /></Tool>
          <Tool label="Tachado" active={state.strike} disabled={source} onClick={() => c().toggleStrike().run()}><Strikethrough /></Tool>
          <Tool label="Resaltado" active={state.highlight} disabled={source} onClick={() => c().toggleHighlight().run()}><Highlighter /></Tool>
          <Tool label="Código" active={state.code} disabled={source} onClick={() => c().toggleCode().run()}><Code /></Tool>
          <Tool label="Quitar formato" disabled={source} onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser /></Tool>
        </Group>
        <Group>
          <Tool label="Enlace" active={state.link || panel === 'link'} disabled={source} onClick={() => setPanel(panel === 'link' ? null : 'link')}><LinkIcon /></Tool>
          {state.link && (
            <Tool label="Quitar enlace" disabled={source} onClick={() => c().extendMarkRange('link').unsetLink().run()}><Link2Off /></Tool>
          )}
        </Group>
        <Group>
          <Tool label="Lista" active={state.bulletList} disabled={source} onClick={() => c().toggleBulletList().run()}><List /></Tool>
          <Tool label="Lista numerada" active={state.orderedList} disabled={source} onClick={() => c().toggleOrderedList().run()}><ListOrdered /></Tool>
          <Tool label="Cita" active={state.blockquote} disabled={source} onClick={() => c().toggleBlockquote().run()}><Quote /></Tool>
          <Tool label="Bloque de código" active={state.codeBlock} disabled={source} onClick={() => c().toggleCodeBlock().run()}><Code2 /></Tool>
          <Tool label="Separador" disabled={source} onClick={() => c().setHorizontalRule().run()}><Minus /></Tool>
        </Group>
        <Group>
          <Tool label="Subir imagen" disabled={source || uploading > 0} onClick={() => fileInput.current?.click()}><ImageIcon /></Tool>
          <Tool label="Imagen desde URL" active={panel === 'image'} disabled={source} onClick={() => setPanel(panel === 'image' ? null : 'image')}>
            <span className="rte__tool-text">URL</span>
          </Tool>
          <Tool label="Video de YouTube" active={panel === 'youtube'} disabled={source} onClick={() => setPanel(panel === 'youtube' ? null : 'youtube')}><VideoIcon /></Tool>
          <Tool
            label="Tabla"
            active={state.table}
            disabled={source}
            onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon />
          </Tool>
        </Group>
        <div className="rte__spacer" />
        <Tool label={source ? 'Volver al editor visual' : 'Ver Markdown'} active={source} onClick={() => { setSource((s) => !s); setPanel(null) }}>
          <FileCode2 />
        </Tool>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            void uploadAndInsert(editor, files)
          }}
        />
      </div>

      {state.table && !source && (
        <div className="rte__contextbar" aria-label="Tabla">
          <span className="rte__contextbar-label">Tabla</span>
          <button type="button" onClick={() => c().addRowAfter().run()}>+ fila</button>
          <button type="button" onClick={() => c().addColumnAfter().run()}>+ columna</button>
          <button type="button" onClick={() => c().deleteRow().run()}>− fila</button>
          <button type="button" onClick={() => c().deleteColumn().run()}>− columna</button>
          <button type="button" onClick={() => c().toggleHeaderRow().run()}>Encabezado</button>
          <button type="button" className="rte__danger" onClick={() => c().deleteTable().run()}>Borrar tabla</button>
        </div>
      )}

      {state.image && !source && (
        <div className="rte__contextbar" aria-label="Imagen">
          <span className="rte__contextbar-label">Imagen</span>
          <button type="button" onClick={() => setPanel('alt')}>Texto alternativo</button>
          <button type="button" className="rte__danger" onClick={() => c().deleteSelection().run()}>Quitar</button>
        </div>
      )}

      {panel && !source && (
        <UrlPanel
          key={panel}
          panel={panel}
          initial={
            panel === 'link'
              ? (editor.getAttributes('link').href as string | undefined) ?? ''
              : panel === 'alt'
                ? (editor.getAttributes('image').alt as string | undefined) ?? ''
                : ''
          }
          onCancel={() => { setPanel(null); editor.commands.focus() }}
          onSubmit={(raw) => {
            const v = raw.trim()
            setError(null)
            if (panel === 'link') {
              if (!v) c().extendMarkRange('link').unsetLink().run()
              else {
                const href = /^(https?:|mailto:|tel:|\/|#)/i.test(v) ? v : `https://${v}`
                if (editor.state.selection.empty && !state.link) {
                  c().insertContent({ type: 'text', text: v, marks: [{ type: 'link', attrs: { href } }] }).run()
                } else {
                  c().extendMarkRange('link').setLink({ href }).run()
                }
              }
            } else if (panel === 'youtube') {
              if (!isValidYoutubeUrl(v)) {
                setError('Ese link no parece de YouTube.')
                return
              }
              c().setYoutubeVideo({ src: v }).run()
            } else if (panel === 'image') {
              if (!/^https:\/\//i.test(v)) {
                setError('La imagen tiene que ser un link https://')
                return
              }
              c().setImage({ src: v }).run()
            } else if (panel === 'alt') {
              c().updateAttributes('image', { alt: v }).run()
            }
            setPanel(null)
          }}
        />
      )}

      {error && <p className="rte__error" role="alert">{error}</p>}
      {uploading > 0 && <p className="rte__status">Subiendo {uploading === 1 ? 'imagen' : `${uploading} imágenes`}…</p>}

      {source ? (
        <textarea
          className="rte__source"
          value={value}
          spellCheck={false}
          aria-label="Contenido en Markdown"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <div className="rte__footer">
        <span>
          {state.words} {state.words === 1 ? 'palabra' : 'palabras'}
          {state.words > 0 && ` · ~${Math.max(1, Math.round(state.words / 220))} min de lectura`}
        </span>
        <span>Pegá o arrastrá imágenes para subirlas</span>
      </div>
    </div>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="rte__group">{children}</div>
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="rte__tool"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the editor's selection: a click on the toolbar would blur it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const PANEL_COPY: Record<Exclude<Panel, null>, { label: string; placeholder: string; action: string }> = {
  link: { label: 'Enlace', placeholder: 'https://… (vacío quita el enlace)', action: 'Aplicar' },
  youtube: { label: 'Video de YouTube', placeholder: 'https://www.youtube.com/watch?v=…', action: 'Insertar' },
  image: { label: 'Imagen desde URL', placeholder: 'https://…/foto.jpg', action: 'Insertar' },
  alt: { label: 'Texto alternativo', placeholder: 'Qué se ve en la foto', action: 'Guardar' },
}

function UrlPanel({
  panel,
  initial,
  onSubmit,
  onCancel,
}: {
  panel: Exclude<Panel, null>
  initial: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  const copy = PANEL_COPY[panel]
  return (
    <div className="rte__panel">
      <label className="rte__panel-label" htmlFor="rte-panel-input">{copy.label}</label>
      <input
        id="rte-panel-input"
        className="tm-input tm-input--sm"
        autoFocus
        value={v}
        placeholder={copy.placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          // Enter inside the post form would submit the whole form.
          if (e.key === 'Enter') { e.preventDefault(); onSubmit(v) }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
      />
      <button type="button" className="tm-btn tm-btn--sm tm-btn--primary" onClick={() => onSubmit(v)}>{copy.action}</button>
      <button type="button" className="tm-btn tm-btn--sm tm-btn--ghost" onClick={onCancel}>Cancelar</button>
    </div>
  )
}
