import './SimulationPanel.css';
import ParameterHighlight from './ParameterHighlight';

function SimulationPanel({ active, simulation }) {
  const placeholderText = active
    ? 'No matching simulation is available for this question yet.'
    : 'What do you want to understand today?';

  return (
    <div className="simulation-panel-container">
      <div className="simulation-header">
        <h2>{simulation ? simulation.name : 'Simulation Workspace'}</h2>
        <p className="subtitle">{simulation ? 'Interactive learning simulation' : 'Ready when you are'}</p>
      </div>

      {active && simulation ? (
        <>
          <ParameterHighlight />
          <iframe
            src={simulation.url}
            title={simulation.name}
            className="simulation-iframe"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          />
        </>
      ) : (
        <div className="simulation-placeholder">
          <p>{placeholderText}</p>
        </div>
      )}
    </div>
  );
}

export default SimulationPanel;
