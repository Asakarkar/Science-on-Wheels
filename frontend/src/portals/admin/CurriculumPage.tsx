import { useSearchParams } from "react-router-dom";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";

export function CurriculumPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Curriculum Master";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = [
    "Curriculum Master",
    "Experiments",
    "Classes",
    "Subjects",
    "Chapters",
    "Topics",
    "Learning Objectives"
  ];

  if (sub === "Experiments") {
    return (
      <div className="portal-module">
        <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
        <ResourceView config={configs.experiments} />
      </div>
    );
  }

  if (["Classes", "Subjects", "Chapters", "Topics", "Learning Objectives"].includes(sub)) {
    const type =
      sub === "Classes"
        ? "CLASS"
        : sub === "Subjects"
        ? "SUBJECT"
        : sub === "Chapters"
        ? "CHAPTER"
        : sub === "Topics"
        ? "TOPIC"
        : "LEARNING_OBJECTIVE";

    const config = {
      ...configs.curriculumNodes,
      title: sub,
      description: `Manage ${sub.toLowerCase()} records in the approved curriculum hierarchy.`,
      filterQuery: `type=${type}`
    };

    return (
      <div className="portal-module">
        <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
        <ResourceView config={config} />
      </div>
    );
  }

  return (
    <div className="portal-module">
      <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
      <ResourceView config={configs.curriculumNodes} />
    </div>
  );
}

function SubnavTabs({
  subOptions,
  activeSub,
  onSelect
}: {
  subOptions: string[];
  activeSub: string;
  onSelect: (sub: string) => void;
}) {
  return (
    <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", borderBottom: "1px solid var(--stone, #e2e8f0)", paddingBottom: "0.75rem" }}>
      {subOptions.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`ghost ${activeSub === opt ? "primary" : ""}`}
          onClick={() => onSelect(opt)}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "6px",
            background: activeSub === opt ? "var(--charcoal-dark, #1E242B)" : "#ffffff",
            color: activeSub === opt ? "#ffffff" : "var(--charcoal, #334155)",
            border: activeSub === opt ? "1px solid var(--charcoal-dark, #1E242B)" : "1px solid var(--stone, #cbd5e1)",
            fontWeight: activeSub === opt ? 700 : 500,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
