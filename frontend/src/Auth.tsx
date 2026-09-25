import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeSlash,
  Plant,
  Compass,
} from "@phosphor-icons/react";
import { authService } from "./services";
import { useApp } from "./store";
import { profiles } from "./seed";
import { Field, CampusArt, Badge } from "./ui";
import s from "./App.module.css";
export function Auth({ register = false }: { register?: boolean }) {
  const { enter } = useApp(),
    nav = useNavigate();
  const [form, setForm] = useState({
      studentId: "",
      password: "",
      confirm: "",
      name: "",
      grade: "2026",
      major: "",
      gender: "不愿透露",
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <Field label={label} error={errors[key]}>
      <input
        autoComplete={
          key === "password"
            ? register
              ? "new-password"
              : "current-password"
            : key === "studentId"
              ? "username"
              : "off"
        }
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </Field>
  );
  const demo = async (id: string) => {
    setBusy(true);
    try {
      await enter(await authService.enter(id));
      nav("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <main className={s.auth}>
      <section className={s.authStory}>
        <Link to="/login" className={s.brand}>
          <span>
            <Compass size={25} weight="fill" />
          </span>
          <div>
            智行校园<small>ZHIXING CAMPUS</small>
          </div>
        </Link>
        <div className={s.authCopy}>
          <Badge>大连海事大学 · 校园生活助手</Badge>
          <h1>
            好好生活，
            <br />
            从今天开始<span>。</span>
          </h1>
          <p>
            把课表、出行与生活装进口袋。
            <br />
            在每一个平凡的校园日常里，找到自己的节奏。
          </p>
          <CampusArt />
          <div className={s.authFoot}>
            <Plant size={22} />
            <span>让校园生活，多一点从容。</span>
            <span>01 / CAMPUS LIFE</span>
          </div>
        </div>
      </section>
      <section className={s.authPanel}>
        <div className={s.authForm}>
          <span className={s.eyebrow}>YOUR CAMPUS, YOUR PACE</span>
          <h2>{register ? "开启你的校园日常" : "欢迎回来，同学"}</h2>
          <p className={s.muted}>
            {register
              ? "填写个人资料，创建你的校园生活账号。"
              : "新的一天，一起把生活安排好。"}
          </p>
          <div className={s.notice}>
            账号与记录保存在服务端 · 暂未接入学校学籍认证
          </div>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const err: Record<string, string> = {};
              if (!form.studentId.trim()) err.studentId = "请输入学号";
              if (form.password.length < 8 || form.password.length > 64)
                err.password = "密码长度须为 8—64 位";
              if (register) {
                if (form.password !== form.confirm)
                  err.confirm = "两次密码不一致";
                if (!form.name.trim()) err.name = "请输入姓名";
                if (
                  !/^\d{4}$/.test(form.grade) ||
                  +form.grade < 1900 ||
                  +form.grade > new Date().getFullYear() + 1
                )
                  err.grade = "请输入有效入学年份";
                if (!form.major.trim()) err.major = "请输入专业";
              }
              setErrors(err);
              if (Object.keys(err).length) return;
              setBusy(true);
              setError("");
              try {
                const p = register
                  ? await authService.register(
                      {
                        studentId: form.studentId,
                        name: form.name,
                        grade: form.grade,
                        major: form.major.trim(),
                        gender: form.gender,
                      },
                      form.password,
                    )
                  : await authService.login(form.studentId, form.password);
                setForm({ ...form, password: "", confirm: "" });
                await enter(p);
                nav("/");
              } catch (ex) {
                setError((ex as Error).message);
                setForm({ ...form, password: "", confirm: "" });
              } finally {
                setBusy(false);
              }
            }}
          >
            {field("studentId", "学号")}
            <div className={s.password}>
              {field("password", "密码", show ? "text" : "password")}
              <button
                type="button"
                aria-label={show ? "隐藏密码" : "显示密码"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {register && (
              <>
                {field("confirm", "确认密码", show ? "text" : "password")}
                <div className={s.formGrid}>
                  {field("name", "姓名")}
                  {field("grade", "入学年份", "number")}
                  <Field label="专业" error={errors.major}>
                    <input
                      list="majors"
                      value={form.major}
                      onChange={(e) =>
                        setForm({ ...form, major: e.target.value })
                      }
                    />
                    <datalist id="majors">
                      <option>交通运输</option>
                      <option>计算机科学与技术</option>
                    </datalist>
                    <small>示例选项，也可直接填写</small>
                  </Field>
                  <Field label="性别">
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value })
                      }
                    >
                      <option>不愿透露</option>
                      <option>男</option>
                      <option>女</option>
                    </select>
                  </Field>
                </div>
              </>
            )}
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            <button className={`${s.primary} ${s.full}`} disabled={busy}>
              {busy ? "正在处理…" : register ? "注册并进入校园" : "登录"}
              <ArrowRight size={19} />
            </button>
          </form>
          <p className={s.authSwitch}>
            {register ? "已有账号？" : "还没有个人资料？"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "返回登录" : "填写注册资料"}
            </Link>
          </p>
          <div className={s.dividerText}>或直接体验，无需密码</div>
          <div className={s.demoUsers}>
            {profiles.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => void demo(p.id)}
              >
                <span className={s.avatar}>{p.name[0]}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.grade} 级 · {p.major}
                  </small>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </div>
        <small className={s.authDisclaimer}>
          真实账号数据保存在本机后端；下方演示体验独立保存在浏览器。
        </small>
      </section>
    </main>
  );
}
