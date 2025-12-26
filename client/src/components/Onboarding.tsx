import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trophy, BarChart3, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProps {
  onComplete: () => void;
}

const ONBOARDING_STEPS = [
  {
    icon: Dumbbell,
    title: "Log Your Workouts",
    description: "Track pull-ups, push-ups, dips, running, and custom exercises. Each workout earns you XP to level up!",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Trophy,
    title: "Join Challenges",
    description: "Compete with friends in fitness challenges. Create your own or join public challenges to stay motivated!",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "View detailed stats, exercise distribution, and track your XP growth over time to see your improvements!",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Compete on Leaderboards",
    description: "See how you rank globally or by specific exercises. Climb the leaderboard and become the top athlete!",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setOpen(false);
    onComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Skip</span>
        </button>

        <DialogHeader>
          <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center", currentStepData.bgColor)}>
            <Icon className={cn("w-8 h-8", currentStepData.color)} />
          </div>
          <DialogTitle className="text-center text-2xl">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep
                    ? "bg-primary w-6"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {isLastStep ? "Get Started" : "Next"}
            </Button>
          </div>

          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Skip tutorial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
