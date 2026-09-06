interface ApprovalStep {
  approver_role: string;
  status: string;
  step_order: number;
}

interface ApprovalStepperProps {
  steps: ApprovalStep[];
  currentStatus: string;
}

export function ApprovalStepper({ steps, currentStatus }: ApprovalStepperProps) {
  const allSteps = [
    { label: 'Submitted', order: 0, completed: true },
    { label: 'Sales Manager', order: 1, completed: false },
    { label: 'Finance', order: 2, completed: false },
    { label: 'Confirmed', order: 3, completed: false },
  ];

  // Update completion status based on approval steps
  steps.forEach(step => {
    const stepIndex = allSteps.findIndex(s => s.label === step.approver_role);
    if (stepIndex !== -1) {
      allSteps[stepIndex].completed = step.status === 'APPROVED';
    }
  });

  // If only Manager approval needed, hide Finance step
  const hasFinanceStep = steps.some(s => s.approver_role === 'FINANCE');
  const displaySteps = hasFinanceStep ? allSteps : allSteps.filter(s => s.label !== 'Finance');

  // Mark confirmed if all approvals are done
  if (currentStatus === 'APPROVED') {
    displaySteps[displaySteps.length - 1].completed = true;
  }

  return (
    <div className="flex items-center justify-between">
      {displaySteps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step.completed
                  ? 'bg-success border-2 border-success'
                  : 'bg-dark-surface border-2 border-dark-border'
              }`}
            >
              {step.completed ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-3 h-3 rounded-full bg-dark-muted"></div>
              )}
            </div>
            
            {/* Label */}
            <div
              className={`mt-2 text-sm font-medium ${
                step.completed ? 'text-success' : 'text-dark-muted'
              }`}
            >
              {step.label}
            </div>
          </div>

          {/* Connector Line */}
          {index < displaySteps.length - 1 && (
            <div
              className={`h-0.5 flex-1 ${
                step.completed ? 'bg-success' : 'bg-dark-border'
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
}
