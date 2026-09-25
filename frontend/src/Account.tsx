import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Gear,
  SignOut,
  UserSwitch,
  LockKey,
  DownloadSimple,
  ArrowUpRight,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { authService, isDemo } from "./services";
import { profiles, seedData, today } from "./seed";
import { download, exportCsv } from "./domain";
import { PageHead, Card, Field, Badge } from "./ui";
import s from "./App.module.css";
export function Account() {
  const { user, setUser, data, enter, logout, notify } = useApp(),
    nav = useNavigate();
  const [form, setForm] = useState({ ...user! }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageHead
        eyebrow="MY LITTLE WORLD / 我的"
        title="你的校园，你的节奏"
        description={
          isDemo()
            ? "当前为本地演示空间。"
            : "个人资料与记录按账号保存在服务端。"
        }
      />
      <section className={s.profileHero}>
        <span className={s.avatar}>{user!.name[0]}</span>
        <div>
          <h2>{user!.name}</h2>
          <p>
            {user!.grade} 级 · {user!.major}
          </p>
          <p>学号 {user!.studentId}</p>
        </div>
        <Badge>{isDemo() ? "本地演示资料" : "已登录账号"} · 未认证学籍</Badge>
      </section>
      <div className={s.twoCol}>
        <Card>
          <h2>个人资料</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !form.name.trim() ||
                !form.major.trim() ||
                !/^\d{4}$/.test(form.grade) ||
                +form.grade < 1900 ||
                +form.grade > new Date().getFullYear() + 1
              ) {
                setError("请填写姓名、专业及有效的入学年份");
                return;
              }
              setError("");
              setBusy(true);
              try {
                const p = await authService.update({
                  ...form,
                  name: form.name.trim(),
                  major: form.major.trim(),
                });
                setUser(p);
                notify("个人资料已保存");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className={s.formGrid}>
              <Field label="姓名">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="学号（不可修改）">
                <input value={form.studentId} readOnly />
              </Field>
              <Field label="入学年份">
                <input
                  type="number"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                />
              </Field>
              <Field label="专业">
                <input
                  list="profile-majors"
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                />
                <datalist id="profile-majors">
                  <option>交通运输</option>
                  <option>计算机科学与技术</option>
                </datalist>
              </Field>
              <Field label="性别">
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option>不愿透露</option>
                  <option>男</option>
                  <option>女</option>
                </select>
              </Field>
            </div>
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            <button className={s.primary} disabled={busy}>
              {busy ? "保存中…" : "保存资料"}
            </button>
          </form>
        </Card>
        <div>
          <Card>
            <h2>我的空间</h2>
            {[
              {
                to: "/history",
                icon: ClockCounterClockwise,
                title: "生活记录",
                hint: `已保存 ${data!.records.length} 条记录`,
              },
              {
                to: "/settings",
                icon: Gear,
                title: "偏好与数据管理",
                hint: "让建议更贴合你的习惯",
              },
              {
                to: "/password",
                icon: LockKey,
                title: "修改密码",
                hint: isDemo()
                  ? "仅演示流程，不保存密码"
                  : "验证原密码，更新登录凭据",
              },
            ].map(({ to, icon: Icon, title, hint }) => (
              <Link className={s.listLine} to={to} key={to}>
                <Icon size={22} />
                <div>
                  <strong>{title}</strong>
                  <small>{hint}</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </Card>
          {isDemo() && (
            <Card className={s.settingsGroup}>
              <h2>切换演示用户</h2>
              <p className={s.muted}>
                用于验证不同用户的记录与偏好不会混用，不代表真实权限隔离。
              </p>
              <div className={s.buttonRow} style={{ marginTop: 15 }}>
                {profiles
                  .filter((p) => p.id !== user!.id)
                  .map((p) => (
                    <button
                      className={s.secondary}
                      key={p.id}
                      onClick={async () => {
                        await enter(await authService.enter(p.id));
                        nav("/");
                        notify("已切换至" + p.name);
                      }}
                    >
                      <UserSwitch size={17} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </Card>
          )}
          <button
            className={s.secondary}
            onClick={async () => {
              try {
                await logout();
                nav("/login");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <SignOut size={18} />
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
export function Password() {
  const [old, setOld] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [fail, setFail] = useState(false),
    [busy, setBusy] = useState(false);
  const { notify } = useApp();
  return (
    <>
      <PageHead
        title="修改密码"
        description={
          isDemo()
            ? "账号流程演示：不会验证或保存密码。"
            : "修改后其他设备的登录将失效，请妥善保管新密码。"
        }
      />
      <Card>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (
              !old ||
              next.length < 8 ||
              next.length > 64 ||
              next !== confirm
            ) {
              setError("请填写原密码，新密码须为 8—64 位且两次输入一致");
              return;
            }
            setBusy(true);
            try {
              await authService.changePassword(old, next, fail);
              notify(
                isDemo()
                  ? "修改流程演示成功，未更改真实密码"
                  : "密码已修改，其他会话已退出",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setOld("");
              setNext("");
              setConfirm("");
              setBusy(false);
            }
          }}
        >
          <Field label="原密码">
            <input
              type="password"
              autoComplete="current-password"
              value={old}
              onChange={(e) => setOld(e.target.value)}
            />
          </Field>
          <Field label="新密码">
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="确认新密码">
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {isDemo() && (
            <label className={s.muted}>
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => setFail(e.target.checked)}
              />
              模拟原密码验证失败
            </label>
          )}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          <div className={s.formActions}>
            <Link className={s.secondary} to="/account">
              返回我的
            </Link>
            <button className={s.primary} disabled={busy}>
              {busy ? "处理中…" : isDemo() ? "演示修改密码" : "确认修改密码"}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
export function Settings() {
  const { user, data, update, notify } = useApp();
  const [p, setP] = useState({ ...data!.preferences }),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const total = p.healthWeight + p.timeWeight + p.costWeight;
  return (
    <>
      <PageHead
        eyebrow="MAKE IT YOURS / 偏好与设置"
        title="把生活，调成适合自己的样子"
        description="偏好将用于三餐筛选和出行安排。模型参数仅保存，尚未应用到实际训练。"
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (Math.abs(total - 1) > 0.001) {
            setError("健康、时间、成本权重之和须为 1");
            return;
          }
          if (!p.termStart || !p.modes.length || p.budget < 0 || p.lead < 0) {
            setError("请检查学期日期、预算、提前时间，并至少选择一种出行方式");
            return;
          }
          setError("");
          await update((d) => ({ ...d, preferences: p }));
          notify("偏好已保存，三餐页面会使用新的筛选条件");
        }}
      >
        <Card className={s.settingsGroup}>
          <h2>生活与饮食偏好</h2>
          <div className={s.formGrid}>
            <Field label="主要健康目标">
              <select
                value={p.healthGoal}
                onChange={(e) => setP({ ...p, healthGoal: e.target.value })}
              >
                {["保持健康", "减重", "增肌", "改善睡眠", "减压"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="默认口味">
              <select
                value={p.taste}
                onChange={(e) => setP({ ...p, taste: e.target.value })}
              >
                {["不限", "清淡", "家常", "香辣"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="忌口（逗号分隔）">
              <input
                value={p.avoid}
                onChange={(e) => setP({ ...p, avoid: e.target.value })}
              />
            </Field>
            <Field label="每餐预算上限（元）">
              <input
                type="number"
                min="0"
                value={p.budget}
                onChange={(e) => setP({ ...p, budget: +e.target.value })}
              />
            </Field>
            <Field label="提前到达时间（分钟）">
              <input
                type="number"
                min="0"
                max="120"
                value={p.lead}
                onChange={(e) => setP({ ...p, lead: +e.target.value })}
              />
            </Field>
            <Field label="第 1 教学周周一">
              <input
                type="date"
                value={p.termStart}
                onChange={(e) => setP({ ...p, termStart: e.target.value })}
              />
            </Field>
          </div>
          <h3>出行偏好</h3>
          <div className={s.checkRow}>
            {["步行", "骑行", "跑步"].map((v) => (
              <label key={v}>
                <input
                  type="checkbox"
                  checked={p.modes.includes(v)}
                  onChange={(e) =>
                    setP({
                      ...p,
                      modes: e.target.checked
                        ? [...p.modes, v]
                        : p.modes.filter((x) => x !== v),
                    })
                  }
                />
                {v}
              </label>
            ))}
          </div>
          <div className={s.threeCol}>
            {(
              [
                ["healthWeight", "健康权重"],
                ["timeWeight", "时间权重"],
                ["costWeight", "成本权重"],
              ] as const
            ).map(([k, label]) => (
              <Field label={`${label}：${p[k].toFixed(1)}`} key={k}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".1"
                  value={p[k]}
                  onChange={(e) => setP({ ...p, [k]: +e.target.value })}
                />
              </Field>
            ))}
          </div>
          <p className={Math.abs(total - 1) > 0.001 ? s.error : s.note}>
            权重合计：{total.toFixed(1)} /
            1.0。健康权重用于三餐排序；全部权重保留供后端决策服务使用。
          </p>
        </Card>
        <Card className={s.settingsGroup}>
          <details>
            <summary>
              <strong>高级模型设置</strong>{" "}
              <Badge tone="orange">尚未接入训练</Badge>
            </summary>
            <div className={s.formGrid} style={{ marginTop: 20 }}>
              <Field label="DQN 学习率">
                <input
                  type="number"
                  min=".001"
                  max=".1"
                  step=".001"
                  value={p.learningRate}
                  onChange={(e) =>
                    setP({ ...p, learningRate: +e.target.value })
                  }
                />
              </Field>
              <Field label="探索率">
                <input
                  type="number"
                  min=".01"
                  max=".5"
                  step=".01"
                  value={p.exploration}
                  onChange={(e) => setP({ ...p, exploration: +e.target.value })}
                />
              </Field>
              <Field label="LSTM 单元数">
                <input
                  type="number"
                  min="32"
                  max="256"
                  value={p.lstm}
                  onChange={(e) => setP({ ...p, lstm: +e.target.value })}
                />
              </Field>
              <Field label="Dropout">
                <input
                  type="number"
                  min=".1"
                  max=".5"
                  step=".05"
                  value={p.dropout}
                  onChange={(e) => setP({ ...p, dropout: +e.target.value })}
                />
              </Field>
            </div>
            <p className={s.note}>
              只保存配置，未运行模型训练；未来后端服务将校验并使用这些参数。
            </p>
          </details>
        </Card>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <button className={s.primary}>保存全部偏好</button>
      </form>
      <Card className={s.settingsGroup}>
        <h2>数据管理</h2>
        <p className={s.muted}>
          {isDemo()
            ? "演示数据保存在当前浏览器，请定期备份。"
            : "数据已保存在本机后端数据库，刷新或退出登录不会删除记录。可下载个人数据备份。"}
        </p>
        <div className={s.buttonRow} style={{ marginTop: 18 }}>
          <button
            className={s.secondary}
            onClick={() =>
              download(
                "智行校园-全部记录.csv",
                exportCsv(data!.records),
                "text/csv;charset=utf-8",
              )
            }
          >
            <DownloadSimple size={18} />
            导出历史 CSV
          </button>
          <button
            className={s.secondary}
            onClick={() =>
              download(
                "智行校园-备份-" + today + ".json",
                JSON.stringify({ version: 1, profile: user, data }, null, 2),
              )
            }
          >
            下载完整 JSON 备份
          </button>
        </div>
        <div className={s.warningBox}>
          <strong>重置当前用户的数据</strong>
          <p>
            仅影响当前用户，不影响其他用户或个人资料。清空后可重新载入示例。
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            我已了解并希望清空当前用户的记录
          </label>
          <div className={s.buttonRow}>
            <button
              className={s.danger}
              disabled={!confirmed}
              onClick={async () => {
                if (!confirm("确认删除当前用户全部业务记录？")) return;
                await update((d) => ({
                  ...d,
                  records: [],
                  awards: [],
                  messages: [],
                }));
                setConfirmed(false);
                notify("当前用户业务记录已清空");
              }}
            >
              清空记录
            </button>
            <button
              className={s.secondary}
              onClick={async () => {
                if (!confirm("载入示例将替换当前业务数据和偏好，是否继续？"))
                  return;
                const seed = seedData(user!.id);
                await update(() => seed);
                setP(seed.preferences);
                notify("示例数据已恢复");
              }}
            >
              恢复示例数据
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
