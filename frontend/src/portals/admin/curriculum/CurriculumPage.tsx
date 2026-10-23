import { useSearchParams } from "react-router-dom";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

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
    <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      {subOptions.map((opt) => (
        <button
          key={opt}
          className={`ghost ${activeSub === opt ? "primary" : ""}`}
          onClick={() => onSelect(opt)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "4px",
            background: activeSub === opt ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer"
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
