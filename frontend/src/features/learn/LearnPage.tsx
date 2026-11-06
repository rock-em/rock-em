import { navigate } from "../../lib/router";
import { usePractice } from "../practice/context";
import { TopicLearningPath } from "./TopicLearningPath";

export function LearnPage() {
  const { problems, topics, topic, setTopic, solved } = usePractice();
  return (
    <main className="page utility-page">
      <h1>Learning paths</h1>
      <p className="account-muted">Build the concepts behind each topic, one step at a time.</p>
      <label className="topic-picker">
        Topic
        <select value={topic} onChange={(event) => setTopic(event.target.value)}>
          {topics.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <TopicLearningPath
        key={topic}
        topic={topic}
        problems={problems.filter((problem) => problem.topic === topic)}
        solvedIds={solved}
        onOpenProblem={(id) => navigate(`/problems/${id}`)}
      />
    </main>
  );
}
