import {
  useEffect,
  useRef,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  X,
  ArrowUpRight,
  Plus,
  Notebook,
  Check,
  Trash,
  PencilSimple,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import s from "./App.module.css";
import type { LifeRecord } from "./types";
import { kindLabels } from "./types";
import { useApp } from "./store";
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className={s.pageHead}>
      <div>
        <span className={s.eyebrow}>{eyebrow ?? "CAMPUS LIFE / 智行校园"}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Card({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`${s.card} ${className}`} {...props}>
      {children}
    </section>
  );
}
export function SectionTitle({
  title,
  more,
  to,
}: {
  title: string;
  more?: string;
  to?: string;
}) {
  return (
    <div className={s.sectionTitle}>
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {more ?? "查看全部"} <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`${s.badge} ${s[tone] ?? ""}`}>{children}</span>;
}
export function Empty({
  title = "这里还没有记录",
  text = "从一条小小的记录开始，让生活慢慢有迹可循。",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <Notebook size={34} weight="duotone" />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => {
        if (opener?.isConnected && !document.querySelector("dialog[open]")) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.modal}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={s.modalHead}>
        <h2 id={titleId}>{title}</h2>
        <button className={s.iconButton} onClick={onClose} aria-label="关闭">
          <X size={22} />
        </button>
      </div>
      <div className={s.modalBody}>{children}</div>
    </dialog>
  );
}
export function AddButton({
  onClick,
  children = "记一笔",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button className={s.primary} onClick={onClick}>
      <Plus size={18} />
      {children}
    </button>
  );
}
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const annotate = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const element = node as ReactElement<Record<string, any>>;
      if (["input", "select", "textarea"].includes(String(element.type)))
        return cloneElement(element, {
          "aria-labelledby": id,
          "aria-describedby": error || hint ? id + "-help" : undefined,
          "aria-invalid": Boolean(error),
        });
      if (element.props.children)
        return cloneElement(element, {
          children: annotate(element.props.children),
        });
      return element;
    });
  return (
    <label className={s.field}>
      <span id={id}>{label}</span>
      {annotate(children)}
      {error ? (
        <small id={id + "-help"} role="alert" className={s.error}>
          {error}
        </small>
      ) : hint ? (
        <small id={id + "-help"}>{hint}</small>
      ) : null}
    </label>
  );
}
export function RecordRow({
  record: r,
  compact = false,
}: {
  record: LifeRecord;
  compact?: boolean;
}) {
  const { edit, remove, update } = useApp();
  return (
    <div className={s.recordRow}>
      <div className={`${s.recordMark} ${r.done ? s.checked : ""}`}>
        <Notebook size={19} />
      </div>
      <div className={s.recordMain}>
        <strong className={r.done ? s.strike : ""}>{r.title}</strong>
        <small>
          {kindLabels[r.kind]} · {r.start ?? r.date}
          {r.place ? " · " + r.place : ""}
          {r.source === "示例" ? " · 示例" : ""}
        </small>
      </div>
      {r.planned && <Badge tone="orange">计划</Badge>}
      {!compact && (
        <>
          <button
            aria-label={"编辑" + r.title}
            className={s.iconButton}
            onClick={() => edit(r)}
          >
            <PencilSimple size={17} />
          </button>
          <button
            aria-label={"删除" + r.title}
            className={s.iconButton}
            onClick={() => {
              if (confirm("删除这条记录？")) void remove(r.id);
            }}
          >
            <Trash size={17} />
          </button>
        </>
      )}
      {r.kind === "task" && (
        <button
          className={s.iconButton}
          aria-label={r.done ? "标记未完成" : "完成" + r.title}
          onClick={() =>
            void update((d) => ({
              ...d,
              records: d.records.map((x) =>
                x.id === r.id ? { ...x, done: !x.done } : x,
              ),
            }))
          }
        >
          <Check size={19} color={r.done ? "#1473c9" : "#8096ad"} />
        </button>
      )}
    </div>
  );
}
export function Trend({
  values,
  labels,
  color = "#1473c9",
  unit = "",
}: {
  values: number[];
  labels: string[];
  color?: string;
  unit?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={s.chart}>
      <div className={s.chartBars}>
        {values.map((v, i) => (
          <div key={i}>
            <span className={s.barValue}>
              {Number(v.toFixed(1))}
              {unit}
            </span>
            <div
              style={{
                height: `${Math.max(3, (v / max) * 100)}%`,
                background: color,
              }}
            />
            <small>{labels[i]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function CampusArt() {
  return (
    <svg
      className={s.campusArt}
      viewBox="0 0 580 330"
      aria-label="绿树与校园建筑插画"
      role="img"
    >
      <defs>
        <linearGradient id="building" x2="1" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6e6f7" />
        </linearGradient>
      </defs>
      <ellipse
        cx="310"
        cy="274"
        rx="240"
        ry="29"
        fill="#b8d6ef"
        opacity=".55"
      />
      <path
        d="M56 275 Q230 177 527 242 L552 274 Q225 221 91 301Z"
        fill="#dfebf5"
      />
      <path d="M309 269 L373 202 L492 219 L439 281Z" fill="#a5c9e6" />
      <g transform="translate(150 77)">
        <path d="M0 80L165 19L295 83L128 146Z" fill="#99bcdc" />
        <path d="M10 91L127 149V233L10 171Z" fill="#c8dff3" />
        <path d="M127 149L286 88V169L127 233Z" fill="url(#building)" />
        <path d="M5 83L165 26L289 83L128 141Z" fill="#f5faff" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <path
              d={`M${143 + i * 23} ${155 - i * 9}v19l12-5v-19Z`}
              fill="#4c85b5"
            />
            <path
              d={`M${143 + i * 23} ${188 - i * 9}v19l12-5v-19Z`}
              fill="#4c85b5"
            />
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${25 + i * 30} ${117 + i * 15}v30l17 8v-30Z`}
            fill="#86aacb"
          />
        ))}
        <path d="M92 45L165 19L228 48L154 76Z" fill="#3c84c2" />
        <path d="M92 45V66L154 99V76Z" fill="#276ba7" />
        <path d="M154 76L228 48V68L154 99Z" fill="#6ca7d7" />
        <path d="M159 21V-34" stroke="#4e7799" strokeWidth="3" />
        <path d="M160-34L194-28L160-14Z" fill="#cf8159" />
      </g>
      {[
        [96, 183, 1],
        [446, 102, 0.8],
        [498, 197, 1.1],
        [124, 250, 0.65],
        [52, 239, 0.8],
        [419, 270, 0.6],
      ].map(([x, y, z], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${z})`}>
          <path d="M0 10V59" stroke="#608ba9" strokeWidth="6" />
          <ellipse
            cy="-5"
            rx="26"
            ry="42"
            fill={i % 2 ? "#84b9d0" : "#5b95b6"}
          />
          <path d="M0 27V-14" stroke="#bedcec" strokeWidth="2" opacity=".5" />
        </g>
      ))}
      <g fill="#ffffff">
        <ellipse cx="342" cy="44" rx="41" ry="11" />
        <ellipse cx="362" cy="36" rx="17" ry="16" />
        <ellipse cx="108" cy="90" rx="33" ry="9" />
      </g>
      <path
        d="M469 58q9-12 18 0q9-12 18 0"
        fill="none"
        stroke="#689ac1"
        strokeWidth="2"
      />
    </svg>
  );
}
