import "./index.css";

const problems = [
  { id: 1, title: "Two Sum", topic: "Arrays", difficulty: "Easy", solved: true },
  { id: 2, title: "Valid Parentheses", topic: "Stack", difficulty: "Easy", solved: false },
  { id: 3, title: "Binary Search", topic: "Search", difficulty: "Easy", solved: false },
  { id: 4, title: "Merge Two Sorted Lists", topic: "Linked Lists", difficulty: "Easy", solved: false },
  { id: 5, title: "Maximum Subarray", topic: "Arrays", difficulty: "Medium", solved: false },
  { id: 6, title: "Number of Islands", topic: "Graphs", difficulty: "Medium", solved: false },
];

function App() {
  return (
    <main className="page">

      <section className="intro">
        <h1>rock em</h1>
        <p>A place to practice programming that is nice on the eyes :D </p>

        <div className="summary">
          <span><strong>Problems</strong> · 6</span>
          <span><strong>Solved</strong> · 1</span>
          <span><strong>Current focus</strong> · Arrays</span>
        </div>
      </section>

      <section>
        <h2>Problems</h2>

        <input
          className="search"
          type="text"
          placeholder="Search problems..."
        />

        <table>
          <thead>
            <tr>
              <th></th>
              <th>Problem</th>
              <th>Topic</th>
              <th>Difficulty</th>
            </tr>
          </thead>

          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id}>
                <td>{problem.solved ? "✓" : problem.id}</td>

                <td>
                  <a href="#">{problem.title}</a>
                </td>

                <td>{problem.topic}</td>
                <td>{problem.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Your progress</h2>

        <p>1 of 6 problems solved.</p>

        <div className="progress-list">
          <p>Arrays <span>1 / 2</span></p>
          <p>Stack <span>0 / 1</span></p>
          <p>Search <span>0 / 1</span></p>
          <p>Linked Lists <span>0 / 1</span></p>
          <p>Graphs <span>0 / 1</span></p>
        </div>
      </section>

      <section>
        <h2>About</h2>
        <p>
          rock em is an open source program for practicing programming
          problems! 
        </p>
      </section>

    </main>
  );
}

export default App;