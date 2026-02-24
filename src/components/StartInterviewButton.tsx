import React, { useState } from 'react';
import { useRouter } from 'next/router';

const StartInterviewButton = () => {
  const [stakeholderEmail, setStakeholderEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_email: stakeholderEmail, organisation }),
      });
      const data = await response.json();
      router.push(data.interview_url);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <button onClick={handleOpen}>Start Interview</button>
      {isOpen && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <form onSubmit={handleSubmit}>
              <label>
                Stakeholder Email:
                <input type='email' value={stakeholderEmail} onChange={(e) => setStakeholderEmail(e.target.value)} />
              </label>
              <label>
                Organisation:
                <input type='text' value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
              </label>
              <button type='submit'>Submit</button>
              <button type='button' onClick={handleClose}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartInterviewButton;
