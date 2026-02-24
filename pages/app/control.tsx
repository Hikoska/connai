import React from 'react';
import { Router, Route, Link } from 'react-router-dom';

const MissionControl = () => {
  return (
    <div>
      <h1>Mission Control</h1>
      <p>Topology placeholder</p>
      <ul>
        <li>
          <Link to='/app/control/topology'>Topology</Link>
        </li>
      </ul>
      <Route path='/app/control/topology' component={Topology} />
    </div>
  );
};

const Topology = () => {
  return (
    <div>
      <h2>Topology</h2>
      <p>Placeholder for topology visualization</p>
    </div>
  );
};

export default MissionControl;
