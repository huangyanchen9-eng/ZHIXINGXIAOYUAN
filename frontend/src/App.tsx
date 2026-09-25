import { isDemo } from "./services";
import { useState, useEffect } from "react";
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
import { Card, PageHead, Empty } from "./ui";
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
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
    setPicker(false);
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
      ? location.pathname === "/"
      : to === "/travel"
        ? ["/travel", "/planner"].includes(location.pathname)
        : to === "/life"
          ? ["/life", "/meals", "/health"].includes(location.pathname)
          : to === "/account"
            ? ["/account", "/settings", "/password", "/history"].includes(
                location.pathname,
              )
            : location.pathname === to;
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <Link to="/" className={s.brand}>
          <span>
            <Compass size={26} weight="fill" />
          </span>
          <div>
            智行校园<small>ZHIXING CAMPUS</small>
          </div>
        </Link>
        <div className={s.schoolPill}>
          <span />
          大连海事大学
        </div>
        <small className={s.navLabel}>我的校园日常</small>
        <nav>
          {navItems.map(({ to, name, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={mainActive(to) ? s.navActive : ""}
            >
              <Icon size={22} weight={mainActive(to) ? "fill" : "regular"} />
              {name}
              <span>{mainActive(to) ? "●" : ""}</span>
            </Link>
          ))}
        </nav>
        <div className={s.navDivider} />
        <small className={s.navLabel}>快捷访问</small>
        <nav className={s.secondaryNav}>
          <NavLink to="/schedule">
            <CalendarBlank size={20} />
            我的课表
          </NavLink>
          <NavLink to="/assistant">
            <ChatCircleDots size={20} />
            AI 伴航<small>DEMO</small>
          </NavLink>
          <NavLink to="/all">
            <GridFour size={20} />
            全部功能
          </NavLink>
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.sidebarNote}>
            <Leaf size={23} weight="duotone" />
            <strong>生活不必匆忙</strong>
            <p>
              每一次小小的进步，
              <br />
              都值得被记录。
            </p>
          </div>
          <Link className={s.sidebarUser} to="/account">
            <span className={s.avatar}>{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.grade} 级 · {isDemo() ? "演示账户" : "个人账户"}
              </small>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className={s.mainWrap}>
        <header className={s.topbar}>
          <div>
            <span className={s.breadcrumb}>我的校园</span>
            <span>/</span>
            <strong>
              {features.find((x) => x.to === location.pathname)?.name ??
                navItems.find((x) => mainActive(x.to))?.name ??
                "智行校园"}
            </strong>
          </div>
          <div>
            <span className={s.localPill}>
              <span />
              {isDemo() ? "本地演示" : "账号已连接"}
            </span>
            <button
              className={s.iconButton}
              aria-label="查看今日提醒"
              onClick={() => navigate("/schedule")}
            >
              <Bell size={21} />
              <i />
            </button>
            <Link to="/account" className={s.avatar}>
              {user.name[0]}
            </Link>
          </div>
        </header>
        <main className={s.main}>
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
            <Route path="/health" element={<Health />} />
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
      <button className={s.fab} onClick={() => setPicker(true)}>
        <Plus size={22} /> <span>记录</span>
      </button>
      <nav className={s.mobileNav}>
        {navItems.map(({ to, name, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={mainActive(to) ? s.mobileActive : ""}
          >
            <Icon size={23} weight={mainActive(to) ? "fill" : "regular"} />
            <span>{name}</span>
          </Link>
        ))}
      </nav>
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
