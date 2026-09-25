import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Profile, UserData, LifeRecord, Kind } from "./types";
import { refreshToday } from "./seed";
import { authService, dataService } from "./services";
type Context = {
  user: Profile | null;
  data: UserData | null;
  ready: boolean;
  enter: (p: Profile) => Promise<void>;
  logout: () => Promise<void>;
  update: (fn: (d: UserData) => UserData) => Promise<void>;
  setUser: (p: Profile) => void;
  notify: (s: string) => void;
  toast: string;
  editor: LifeRecord | Kind | null;
  edit: (r: LifeRecord | Kind | null) => void;
  saveRecord: (r: LifeRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
const C = createContext<Context>(null!);
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null),
    [data, setData] = useState<UserData | null>(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(""),
    [editor, edit] = useState<LifeRecord | Kind | null>(null);
  const ref = useRef<UserData | null>(null),
    userRef = useRef<Profile | null>(null),
    sessionEpoch = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (s: string) => {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4000);
  };
  const enter = async (p: Profile) => {
    const epoch = ++sessionEpoch.current;
    const profile = await authService.getProfile(p);
    const next = await dataService.read(p.id);
    if (epoch !== sessionEpoch.current) return;
    userRef.current = profile;
    ref.current = next;
    setUser(profile);
    setData(next);
    edit(null);
  };
  useEffect(() => {
    let cancelled = false;
    const expired = () => {
      sessionEpoch.current++;
      ref.current = null;
      userRef.current = null;
      setUser(null);
      setData(null);
      edit(null);
      notify("登录已失效，请重新登录");
    };
    window.addEventListener("zhixing:session-expired", expired);
    authService
      .session()
      .then(async (p) => {
        if (p && !cancelled) await enter(p);
      })
      .catch((e) => {
        if (!cancelled) notify((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      window.removeEventListener("zhixing:session-expired", expired);
      clearTimeout(timer.current);
    };
  }, []);
  const owner = user?.id;
  const ownerEpoch = sessionEpoch.current;
  const queue = useRef<Promise<void>>(Promise.resolve());
  const update = (fn: (d: UserData) => UserData): Promise<void> => {
    const operation = queue.current
      .catch(() => {})
      .then(async () => {
        if (
          !ref.current ||
          !userRef.current ||
          userRef.current.id !== owner ||
          ownerEpoch !== sessionEpoch.current
        )
          throw Error("当前账号已改变，请重试");
        const next = fn(ref.current);
        try {
          await dataService.write(userRef.current.id, next);
          if (ownerEpoch !== sessionEpoch.current) return;
          ref.current = next;
          setData(next);
        } catch (e) {
          notify((e as Error).message);
          throw e;
        }
      });
    queue.current = operation;
    return operation;
  };
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (refreshToday()) setData((d) => (d ? { ...d } : d));
      const next = new Date();
      next.setHours(24, 0, 0, 25);
      clearTimeout(timer);
      timer = setTimeout(tick, +next - Date.now());
    };
    tick();
    window.addEventListener("focus", tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  const logout = async () => {
    await queue.current.catch(() => {});
    await authService.logout();
    sessionEpoch.current++;
    userRef.current = null;
    ref.current = null;
    setUser(null);
    setData(null);
    edit(null);
    setToast("");
  };
  const saveRecord = async (r: LifeRecord) => {
    await update((d) => ({
      ...d,
      records: [...d.records.filter((x) => x.id !== r.id), r],
    }));
    notify("已保存，可以在对应页面查看");
    edit(null);
  };
  const remove = async (id: string) => {
    await update((d) => ({
      ...d,
      records: d.records.filter((r) => r.id !== id),
    }));
    notify("记录已删除");
  };
  return (
    <C.Provider
      value={{
        user,
        data,
        ready,
        enter,
        logout,
        update,
        setUser,
        notify,
        toast,
        editor,
        edit,
        saveRecord,
        remove,
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useApp = () => useContext(C);
