import { isDemo } from "./services";
import { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Compass,
  House,
  MapTrifold,
  Leaf,
  Medal,
  UserCircle,
  Plus,
  CalendarBlank,
  ChatCircleDots,
  GridFour,
  SignOut,
  Bell,
  ArrowUpRight,
  BookOpen,
  ForkKnife,
  Heartbeat,
  ClockCounterClockwise,
  Gear,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { Auth } from "./Auth";
import { Home } from "./Home";
import { RecordEditor, RecordPicker } from "./RecordEditor";
import { Schedule } from "./Schedule";
import { Meals } from "./Meals";
import { Health, History } from "./Health";
import { Travel, Planner } from "./Travel";
import { Growth, Assistant } from "./Growth";
import { Account, Settings, Password } from "./Account";
import { Card, PageHead, Empty, Modal } from "./ui";
import s from "./App.module.css";
const navItems = [
  { to: "/", name: "今日", icon: House },
  { to: "/travel", name: "出行", icon: MapTrifold },
  { to: "/life", name: "生活", icon: Leaf },
  { to: "/growth", name: "成长", icon: Medal },
  { to: "/account", name: "我的", icon: UserCircle },
];
export const features = [
  {
    to: "/schedule",
    name: "我的课表",
    desc: "每一节课，都心中有数",
    icon: CalendarBlank,
  },
  {
    to: "/travel",
    name: "校园导航",
    desc: "熟悉校园的每一条路",
    icon: MapTrifold,
  },
  {
    to: "/planner",
    name: "多任务行程",
    desc: "把想做的事，顺路安排",
    icon: Compass,
  },
  {
    to: "/meals",
    name: "三餐饮食",
    desc: "早餐、午餐、晚餐都照顾好",
    icon: ForkKnife,
  },
  {
    to: "/health",
    name: "健康分析",
    desc: "倾听身体，找到生活节奏",
    icon: Heartbeat,
  },
  {
    to: "/history",
    name: "生活记录",
    desc: "回看每一个认真的日常",
    icon: ClockCounterClockwise,
  },
  {
    to: "/assistant",
    name: "AI 伴航",
    desc: "你的校园生活对话伙伴",
    icon: ChatCircleDots,
  },
  {
    to: "/growth",
    name: "伴学与五育成就",
    desc: "每天一点点，看见自己的成长",
    icon: Medal,
  },
  {
    to: "/settings",
    name: "偏好与设置",
    desc: "让智行更懂你的习惯",
    icon: Gear,
  },
];
export function FeatureGrid({ life = false }: { life?: boolean }) {
  return (
    <>
      <PageHead
        title={life ? "生活，值得认真对待" : "校园日常，都在这里"}
        description={
          life
            ? "好好吃饭、好好休息，也记得照顾自己的心情。"
            : "从每一天的小事开始，找到更从容的校园节奏。"
        }
      />
      <div className={s.featureGrid}>
        {features
          .filter(
            (x) =>
              !life ||
              ["/meals", "/health", "/history", "/assistant"].includes(x.to),
          )
          .map(({ to, name, desc, icon: Icon }) => (
            <Link to={to} className={s.featureCard} key={to}>
              <span className={s.featureIcon}>
                <Icon size={30} weight="duotone" />
              </span>
              <h2>{name}</h2>
              <p>{desc}</p>
              <ArrowUpRight size={22} />
            </Link>
          ))}
      </div>
    </>
  );
}
export default function App() {
  const { user, ready, logout, toast } = useApp();
  const [picker, setPicker] = useState(false);
  const [controls, setControls] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
    setPicker(false);
    setControls(false);
  }, [location.pathname]);
  if (!ready)
    return (
      <div className={s.loading}>
        <Compass size={42} />
        正在打开你的校园日常…
      </div>
    );
  if (!user)
    return (
      <>
        <Routes>
          <Route path="/register" element={<Auth key="register" register />} />
          <Route path="/login" element={<Auth key="login" />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {toast && (
          <div role="status" className={s.toast}>
            {toast}
          </div>
        )}
      </>
    );
  const mainActive = (to: string) =>
    to === "/"
      ? ["/", "/schedule"].includes(location.pathname)
      : to === "/travel"
        ? ["/travel", "/planner"].includes(location.pathname)
        : to === "/life"
          ? ["/life", "/meals", "/health", "/assistant", "/all"].includes(
              location.pathname,
            )
          : to === "/account"
            ? ["/account", "/settings", "/password", "/history"].includes(
                location.pathname,
              )
            : location.pathname === to;
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => mainActive(item.to)),
  );
  const campusPhotos = [
    {
      file: "lake-wide",
      alt: "大连海事大学日光下的校园建筑与湖面倒影",
      position: "48% 50%",
    },
    { file: "aerial", alt: "大连海事大学校园与海岸航拍", position: "52% 50%" },
    { file: "garden", alt: "大连海事大学清晨的园间小路", position: "50% 50%" },
    {
      file: "hall",
      alt: "大连海事大学清晨的教学楼与广场",
      position: "52% 50%",
    },
    { file: "avenue", alt: "大连海事大学清晨的校园大道", position: "50% 50%" },
  ];
  const campusPhoto = campusPhotos[activeIndex];
  const startSwipe = (e: React.TouchEvent, onNav = false) => {
    swipeStart.current = null;
    if (e.touches.length !== 1 || document.querySelector("dialog[open]"))
      return;
    const target = e.target as HTMLElement;
    if (
      !onNav &&
      target.closest(
        "a, button, input, select, textarea, svg, canvas, [role=dialog], [data-no-swipe], .amap-container",
      )
    )
      return;
    // Give horizontally scrollable content (timetables/comparisons) its gesture.
    if (!onNav) {
      let element: HTMLElement | null = target;
      while (element && element !== e.currentTarget) {
        if (
          /auto|scroll/.test(getComputedStyle(element).overflowX) &&
          element.scrollWidth > element.clientWidth + 1
        )
          return;
        element = element.parentElement;
      }
    }
    swipeStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: performance.now(),
    };
  };
  const endSwipe = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (
      !start ||
      !e.changedTouches.length ||
      performance.now() - start.time > 750 ||
      document.querySelector("dialog[open]")
    )
      return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const target = activeIndex + (dx < 0 ? 1 : -1);
    if (target >= 0 && target < navItems.length) {
      if (e.cancelable) e.preventDefault();
      navigate(navItems[target].to);
    }
  };
  return (
    <div className={s.glassShell}>
      <picture className={s.campusBackdrop}>
        <source
          media="(max-width: 700px)"
          srcSet={
            activeIndex === 0
              ? "/images/campus-lake-mobile.webp"
              : `/images/campus-${campusPhoto.file}.webp`
          }
        />
        <img
          src={`/images/campus-${campusPhoto.file}.webp`}
          alt={campusPhoto.alt}
          style={{ objectPosition: campusPhoto.position }}
          fetchPriority="high"
        />
      </picture>
      <div className={s.campusShade} />
      <div className={location.pathname === "/" ? s.phonePage : s.glassPage}>
        <header className={s.glassHeader}>
          <button
            className={s.controlButton}
            aria-label="打开快捷功能"
            aria-haspopup="dialog"
            aria-expanded={controls}
            onClick={() => setControls(true)}
          >
            <GridFour size={23} />
            <span>快捷访问</span>
          </button>
          <div className={s.glassIdentity}>
            <span>{isDemo() ? "本地演示" : "智行校园"}</span>
            <Link to="/account" aria-label="查看我的账号">
              {user.name[0]}
            </Link>
          </div>
        </header>
        <main
          className={s.glassMain}
          onTouchStart={(e) => startSwipe(e)}
          onTouchEnd={endSwipe}
          onTouchCancel={() => {
            swipeStart.current = null;
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<Home openRecord={() => setPicker(true)} />}
            />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/travel" element={<Travel />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/life" element={<FeatureGrid life />} />
            <Route path="/meals" element={<Meals />} />
            <Route
              path="/health"
              element={<Health openRecord={() => setPicker(true)} />}
            />
            <Route path="/history" element={<History />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/account" element={<Account />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/password" element={<Password />} />
            <Route path="/all" element={<FeatureGrid />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route
              path="*"
              element={
                <Empty
                  title="这条校园小路暂时不存在"
                  action={
                    <Link className={s.primary} to="/">
                      回到今日
                    </Link>
                  }
                />
              }
            />
          </Routes>
        </main>
      </div>
      {!["/", "/health"].includes(location.pathname) && (
        <button
          className={s.glassRecord}
          aria-label="记录"
          onClick={() => setPicker(true)}
        >
          <Plus size={19} />
          <span>记录</span>
        </button>
      )}
      <nav
        className={s.glassNav}
        aria-label="主导航"
        onTouchStart={(e) => startSwipe(e, true)}
        onTouchEnd={endSwipe}
        onTouchCancel={() => {
          swipeStart.current = null;
        }}
      >
        <span
          className={s.navSlider}
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {navItems.map(({ to, name, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={mainActive(to) ? s.glassNavActive : ""}
            aria-current={mainActive(to) ? "page" : undefined}
          >
            <Icon size={23} weight={mainActive(to) ? "fill" : "regular"} />
            <span>{name}</span>
          </Link>
        ))}
      </nav>
      {controls && (
        <Modal title="快捷功能" onClose={() => setControls(false)}>
          <div className={s.controlGrid}>
            {[
              {
                to: "/schedule",
                name: "我的课表",
                icon: CalendarBlank,
                detail: "课程与教室",
              },
              {
                to: "/assistant",
                name: "AI 伴航",
                icon: ChatCircleDots,
                detail: "你的校园对话伙伴",
              },
              {
                to: "/meals",
                name: "今天吃什么",
                icon: ForkKnife,
                detail: "早餐 · 午餐 · 晚餐",
              },
              {
                to: "/all",
                name: "全部功能",
                icon: GridFour,
                detail: "探索校园日常",
              },
            ].map(({ to, name, icon: Icon, detail }) => (
              <Link key={to} to={to} onClick={() => setControls(false)}>
                <Icon size={30} weight="duotone" />
                <strong>{name}</strong>
                <small>{detail}</small>
              </Link>
            ))}
          </div>
          <p className={s.controlHint}>
            左右滑动页面或底部导航，切换校园日常。
          </p>
        </Modal>
      )}
      {picker && <RecordPicker close={() => setPicker(false)} />}
      <RecordEditor />
      {toast && (
        <div role="status" className={s.toast}>
          {toast}
        </div>
      )}
    </div>
  );
}
