import {
  Armchair,
  ArrowRight,
  CircleHelp,
  Image,
  LayoutDashboard,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { useI18n } from "../../i18n/LanguageContext";
import "./help.css";

type LocalizedText = { en: string; zh: string };

const QUICK_STARTS: Array<{
  to: string;
  icon: LucideIcon;
  title: LocalizedText;
  text: LocalizedText;
}> = [
  {
    to: "/layout",
    icon: LayoutDashboard,
    title: { en: "Plan my layout", zh: "规划我的布局" },
    text: { en: "Start with a clear, top-down floor plan.", zh: "从一张清晰的俯视户型图开始。" },
  },
  {
    to: "/style",
    icon: Image,
    title: { en: "Restyle a room", zh: "重新设计房间风格" },
    text: { en: "Start with one bright, straight-on room photo.", zh: "从一张明亮、正对房间的照片开始。" },
  },
  {
    to: "/furniture",
    icon: Armchair,
    title: { en: "Create furniture", zh: "创建定制家具" },
    text: { en: "Start with a sketch, an inspiration image, or both.", zh: "从草图、灵感图，或两者结合开始。" },
  },
];

const FAQS: Array<{ question: LocalizedText; answer: LocalizedText }> = [
  {
    question: { en: "Which tool should I choose?", zh: "我应该选择哪个工具？" },
    answer: {
      en: "Choose Layout for a whole-home floor plan, Style for the look of one existing room, and Furniture for a single custom item.",
      zh: "整屋户型与功能规划请选择“布局”；单个现有房间的视觉改造请选择“风格”；单件定制产品请选择“家具”。",
    },
  },
  {
    question: { en: "Which file formats can I upload?", zh: "支持哪些文件格式？" },
    answer: {
      en: "Layout accepts JPG, PNG, and clear PDF screenshots. Style accepts room images. Furniture accepts JPG, PNG, and WebP reference images.",
      zh: "布局支持 JPG、PNG 和清晰的 PDF 截图；风格支持房间照片；家具支持 JPG、PNG 和 WebP 参考图。",
    },
  },
  {
    question: { en: "What makes a good floor plan?", zh: "什么样的户型图效果最好？" },
    answer: {
      en: "Use a flat, top-down plan with readable room labels and clear walls, doors, and windows. Avoid perspective photos and heavy annotations.",
      zh: "使用平整的俯视图，确保房间文字、墙体、门窗清晰。尽量避免透视照片和大量手写标记。",
    },
  },
  {
    question: { en: "How should I photograph a room?", zh: "怎样拍摄房间照片？" },
    answer: {
      en: "Photograph the whole room in bright, even light. Keep the camera level, avoid people, and reduce motion blur or extreme wide-angle distortion.",
      zh: "在明亮均匀的光线下拍摄完整房间，保持相机水平，避免人物入镜，并减少运动模糊和过强的广角畸变。",
    },
  },
  {
    question: { en: "What should I upload for furniture?", zh: "家具设计应该上传什么？" },
    answer: {
      en: "A sketch helps define structure; an inspiration image helps define style and material. You can use either one or combine both.",
      zh: "草图更适合表达结构，灵感图更适合表达风格与材质。你可以使用其中一种，也可以组合使用。",
    },
  },
  {
    question: { en: "How long does a result take?", zh: "生成结果需要多长时间？" },
    answer: {
      en: "Timing varies with the file and request. Keep the page open while progress is shown. If a run fails, check the file guidance and try again or use the sample project.",
      zh: "耗时会随文件和要求而变化。显示进度时请保持页面开启；如果失败，请检查文件要求后重试，或先使用示例项目。",
    },
  },
  {
    question: { en: "Can I try the product without my own file?", zh: "没有自己的文件也可以体验吗？" },
    answer: {
      en: "Yes. Layout and Furniture include sample projects so you can understand the flow before uploading personal content.",
      zh: "可以。布局和家具流程都提供示例项目，你可以先了解完整流程，再决定是否上传个人内容。",
    },
  },
  {
    question: { en: "What should I do if the result looks wrong?", zh: "如果结果不理想怎么办？" },
    answer: {
      en: "Start with a clearer image, confirm room or furniture details carefully, and describe the one or two changes that matter most before trying again.",
      zh: "先换用更清晰的图片，仔细确认房间或家具信息，并在重试前优先写明最重要的一到两项修改。",
    },
  },
];

export function HelpPage() {
  const { lang, t } = useI18n();
  const copy = (text: LocalizedText) => text[lang];

  return (
    <main className="page help-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: lang === "zh" ? "帮助" : "Help" }]} />

      <header className="help-hero">
        <span className="help-kicker"><CircleHelp size={16} aria-hidden="true" />{lang === "zh" ? "帮助中心" : "Help Center"}</span>
        <h1>{lang === "zh" ? "更顺利地完成一次设计。" : "Make every design run smoother."}</h1>
        <p>{lang === "zh" ? "选择正确的工具、准备更合适的文件，并在上传前了解会发生什么。" : "Choose the right tool, prepare a stronger input, and know what to expect before you upload."}</p>
        <nav className="help-hero__links" aria-label={lang === "zh" ? "帮助页面目录" : "Help page sections"}>
          <a href="#quick-start">{lang === "zh" ? "快速开始" : "Quick start"}</a>
          <a href="#upload-checklist">{lang === "zh" ? "上传检查" : "Upload checklist"}</a>
          <a href="#faq">FAQ</a>
          <a href="#privacy">{lang === "zh" ? "上传与隐私" : "Uploads & privacy"}</a>
        </nav>
      </header>

      <section id="quick-start" className="help-section" aria-labelledby="quick-start-title">
        <div className="help-section__head">
          <div>
            <span className="help-section__eyebrow">01</span>
            <h2 id="quick-start-title">{lang === "zh" ? "你想完成什么？" : "What do you want to make?"}</h2>
          </div>
          <p>{lang === "zh" ? "三个工具分别解决不同的问题。" : "Each tool is designed for a different starting point."}</p>
        </div>
        <div className="help-quick-grid">
          {QUICK_STARTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="card help-quick-card">
                <Icon size={24} aria-hidden="true" />
                <h3>{copy(item.title)}</h3>
                <p>{copy(item.text)}</p>
                <span>{lang === "zh" ? "开始" : "Start"}<ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="upload-checklist" className="help-section" aria-labelledby="upload-checklist-title">
        <div className="help-section__head">
          <div>
            <span className="help-section__eyebrow">02</span>
            <h2 id="upload-checklist-title">{lang === "zh" ? "上传前一分钟" : "One minute before you upload"}</h2>
          </div>
          <p>{lang === "zh" ? "清晰的输入通常能带来更稳定的结果。" : "A clearer input usually creates a more dependable result."}</p>
        </div>
        <div className="help-checklist">
          <article>
            <Image size={22} aria-hidden="true" />
            <h3>{lang === "zh" ? "主体明确" : "One clear subject"}</h3>
            <p>{lang === "zh" ? "尽量完整展示一个空间、一张户型图或一件家具。" : "Show one complete room, plan, or furniture item whenever possible."}</p>
          </article>
          <article>
            <SunMedium size={22} aria-hidden="true" />
            <h3>{lang === "zh" ? "光线与清晰度" : "Light and clarity"}</h3>
            <p>{lang === "zh" ? "避免模糊、强烈阴影、反光和过度裁切。" : "Avoid blur, harsh shadows, reflections, and overly tight crops."}</p>
          </article>
          <article>
            <ShieldCheck size={22} aria-hidden="true" />
            <h3>{lang === "zh" ? "移除敏感信息" : "Remove sensitive details"}</h3>
            <p>{lang === "zh" ? "上传前裁掉人物、门牌、文件、屏幕和私人照片。" : "Crop out people, addresses, documents, screens, and personal photos."}</p>
          </article>
        </div>
      </section>

      <section id="faq" className="help-section" aria-labelledby="faq-title">
        <div className="help-section__head">
          <div>
            <span className="help-section__eyebrow">03</span>
            <h2 id="faq-title">{lang === "zh" ? "常见问题" : "Frequently asked questions"}</h2>
          </div>
          <p>{lang === "zh" ? "开始前最常见的几个问题。" : "The practical questions that come up before a first run."}</p>
        </div>
        <div className="faq-list">
          {FAQS.map((item) => (
            <details key={item.question.en}>
              <summary>{copy(item.question)}</summary>
              <p>{copy(item.answer)}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="privacy" className="help-privacy" aria-labelledby="privacy-title">
        <ShieldCheck size={28} aria-hidden="true" />
        <div>
          <span className="help-section__eyebrow">{lang === "zh" ? "测试阶段提示" : "Beta guidance"}</span>
          <h2 id="privacy-title">{lang === "zh" ? "先保护隐私，再开始设计。" : "Protect your privacy before you design."}</h2>
          <p>{lang === "zh" ? "你上传的文件会被发送至 See My Home 服务，用于生成你请求的结果。请仅上传你有权使用的内容，并避免人物、地址、证件或其他机密信息。如果不确定，可以先使用内置示例体验流程。" : "Files you upload are sent to the See My Home service to create the result you request. Only use content you have permission to upload, and avoid people, addresses, identity documents, or confidential details. If you are unsure, start with a built-in sample."}</p>
        </div>
      </section>
    </main>
  );
}
