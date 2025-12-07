import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Clock, Check, X, Globe, Lock, Bell, ArrowLeft, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  goal: number;
  startDate: number;
  endDate: number;
  isPublic: boolean;
  createdBy: string;
  participantIds: string[];
  participants: {
    userId: string;
    username: string;
    avatar: string;
    progress: number;
    joinedAt: number;
  }[];
  colors: { from: string; to: string };
}

interface ChallengeInvite {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: string;
  invitedBy: string;
  invitedByUsername: string;
  invitedByAvatar: string;
  createdAt: number;
}

interface AppUser {
  id: string;
  username: string;
  avatar: string;
  level: number;
}

const CHALLENGE_TEMPLATES = [
  { id: "30-push", name: "30 Day Push-up Blast", type: "push-up", goal: 1500, timeframe: "30 days" },
  { id: "50-pull", name: "50 Rep Pull-up Challenge", type: "pull-up", goal: 500, timeframe: "14 days" },
  { id: "100-dips", name: "100 Dip Challenge", type: "dip", goal: 1000, timeframe: "7 days" },
  { id: "5k-run", name: "5K Weekly Run", type: "run", goal: 50, timeframe: "7 days" },
];

export default function ChallengesPage() {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [challengeName, setChallengeName] = useState("");
  const [exerciseType, setExerciseType] = useState("");
  const [goal, setGoal] = useState("");
  const [suggestedGoal, setSuggestedGoal] = useState<number>(0);
  const [durationDays, setDurationDays] = useState("7");
  const [customDurationValue, setCustomDurationValue] = useState("");
  const [customDurationUnit, setCustomDurationUnit] = useState("days");
  const [startDate, setStartDate] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const idToken = await user.getIdToken();
      
      const [challengesRes, invitesRes, usersRes] = await Promise.all([
        fetch(getApiUrl("/api/challenges"), {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch(getApiUrl("/api/invites"), {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch(getApiUrl("/api/users"), {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);
      
      if (challengesRes.ok) {
        const data = await challengesRes.json();
        if (data.success) {
          setChallenges(data.challenges || []);
        }
      }
      
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        if (data.success) {
          setInvites(data.invites || []);
        }
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success) {
          setAllUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error("Error fetching challenges data:", err);
      setError("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;
    
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/invites?action=respond&id=${inviteId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, action: "accept" }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        toast({
          title: "Challenge Accepted!",
          description: `You joined "${invite.challengeTitle}"`,
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to accept invite",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      toast({
        title: "Error",
        description: "Failed to accept invite",
        variant: "destructive",
      });
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (!user) return;
    
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/invites?action=respond&id=${inviteId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, action: "decline" }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        toast({
          title: "Invitation Declined",
          description: `You declined "${invite.challengeTitle}"`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to decline invite",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error declining invite:", err);
      toast({
        title: "Error",
        description: "Failed to decline invite",
        variant: "destructive",
      });
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/challenges?action=join&id=${challengeId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Joined Challenge!",
          description: "You've joined the challenge. Good luck!",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to join challenge",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error joining challenge:", err);
      toast({
        title: "Error",
        description: "Failed to join challenge",
        variant: "destructive",
      });
    }
  };

  const generateRandomGoal = () => {
    setSuggestedGoal(Math.floor(Math.random() * 500) + 1);
  };

  const resetForm = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
    setChallengeName("");
    setExerciseType("");
    setGoal("");
    setSuggestedGoal(0);
    setDurationDays("7");
    setCustomDurationValue("");
    setCustomDurationUnit("days");
    setStartDate("");
    setSelectedInvitees([]);
    setIsPublic(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !challengeName || !exerciseType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const finalGoal = Number(goal || suggestedGoal);
    if (!finalGoal || finalGoal <= 0 || isNaN(finalGoal)) {
      toast({
        title: "Invalid Goal",
        description: "Please enter a valid goal number",
        variant: "destructive",
      });
      return;
    }
    
    const duration = customDurationValue ? Number(customDurationValue) : Number(durationDays);
    if (!duration || duration <= 0 || isNaN(duration)) {
      toast({
        title: "Invalid Duration",
        description: "Please enter a valid duration",
        variant: "destructive",
      });
      return;
    }
    
    let durationInDays: number;
    if (durationDays === "custom") {
      if (customDurationUnit === "hours") {
        durationInDays = duration / 24;
      } else {
        durationInDays = duration;
      }
    } else {
      durationInDays = duration;
    }
    
    if (durationInDays <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(getApiUrl("/api/challenges"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          title: challengeName,
          exerciseType,
          goal: finalGoal,
          durationDays: durationInDays,
          startDate: startDate || null,
          isPublic,
          inviteeIds: selectedInvitees,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Challenge Created!",
          description: selectedInvitees.length > 0 
            ? `Invited ${selectedInvitees.length} others.` 
            : "You're the first participant.",
        });
        resetForm();
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create challenge",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating challenge:", err);
      toast({
        title: "Error",
        description: "Failed to create challenge",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectTemplate = (templateId: string) => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setChallengeName(template.name);
      setExerciseType(template.type);
      setGoal(template.goal.toString());
      const days = template.timeframe.split(" ")[0];
      setDurationDays(days);
    }
  };

  const removeInvitee = (userId: string) => {
    setSelectedInvitees(prev => prev.filter(id => id !== userId));
  };

  const toggleInvitee = (userId: string) => {
    setSelectedInvitees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const now = Date.now();
  
  const myChallenges = challenges.filter(c => {
    const isParticipant = c.participantIds?.includes(user?.uid || "");
    const isActive = now >= c.startDate && now <= c.endDate;
    const myProgress = c.participants?.find(p => p.userId === user?.uid)?.progress || 0;
    const isNotCompleted = myProgress < c.goal;
    return isParticipant && isActive && isNotCompleted;
  });

  const doneChallenges = challenges.filter(c => {
    const isParticipant = c.participantIds?.includes(user?.uid || "");
    const hasEnded = now > c.endDate;
    const myProgress = c.participants?.find(p => p.userId === user?.uid)?.progress || 0;
    const isCompleted = myProgress >= c.goal;
    return isParticipant && (hasEnded || isCompleted);
  });

  const discoverChallenges = challenges.filter(c => 
    c.isPublic && !c.participantIds?.includes(user?.uid || "")
  );

  const handleInviteToChallenge = async (challengeId: string, inviteeId: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/challenges?action=invite&id=${challengeId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, inviteeId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Invite Sent!",
          description: "The user has been invited to the challenge.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send invite",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error inviting to challenge:", err);
      toast({
        title: "Error",
        description: "Failed to send invite",
        variant: "destructive",
      });
    }
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Go back"
            >
              <ArrowLeft size={20} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-heading font-bold">Create Challenge</h1>
              <p className="text-xs text-muted-foreground">Choose a template or customize your own.</p>
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto space-y-6 mt-6">
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Challenge Template</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CHALLENGE_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => selectTemplate(template.id)}
                          className={`p-3 rounded-lg border-2 text-sm transition-all ${
                            selectedTemplate === template.id
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {template.name.split(' ').slice(0, 2).join(' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Challenge Name</Label>
                    <Input 
                      placeholder="e.g., 30 Day Push-up Blast" 
                      value={challengeName}
                      onChange={(e) => setChallengeName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exercise Type</Label>
                    <Select value={exerciseType} onValueChange={setExerciseType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="push-up">Push-ups</SelectItem>
                        <SelectItem value="pull-up">Pull-ups</SelectItem>
                        <SelectItem value="dip">Dips</SelectItem>
                        <SelectItem value="run">Running (km)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Goal</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          onFocus={() => setSuggestedGoal(0)}
                          className={goal === "" && suggestedGoal > 0 ? "text-muted-foreground" : ""}
                        />
                        {goal === "" && suggestedGoal > 0 && (
                          <div className="absolute inset-0 flex items-center pointer-events-none px-3 text-muted-foreground">
                            {suggestedGoal}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select value={durationDays} onValueChange={setDurationDays}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="14">14 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {durationDays === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Duration Value</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g., 21" 
                          value={customDurationValue}
                          onChange={(e) => setCustomDurationValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select value={customDurationUnit} onValueChange={setCustomDurationUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Start Date & Time (Optional)</Label>
                    <Input 
                      type="datetime-local" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to start immediately</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isPublic ? <Globe size={16} className="text-primary" /> : <Lock size={16} className="text-muted-foreground" />}
                      <Label className="font-medium">{isPublic ? "Public" : "Private"}</Label>
                    </div>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>

                  <div className="space-y-2">
                    <Label>Invite Others (Optional)</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {selectedInvitees.length > 0 
                            ? `Selected ${selectedInvitees.length} person${selectedInvitees.length > 1 ? 's' : ''}` 
                            : 'Select people to invite'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Invite Others</DialogTitle>
                          <DialogDescription>Select people to invite to this challenge.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {allUsers.filter(u => u.id !== user?.uid).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No other users yet</p>
                          ) : (
                            allUsers.filter(u => u.id !== user?.uid).map(appUser => (
                              <div 
                                key={appUser.id} 
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" 
                                onClick={() => toggleInvitee(appUser.id)}
                              >
                                <Checkbox 
                                  checked={selectedInvitees.includes(appUser.id)}
                                  onCheckedChange={() => toggleInvitee(appUser.id)}
                                />
                                <img src={appUser.avatar} alt={appUser.username} className="w-8 h-8 rounded-full" />
                                <span className="flex-1 font-medium">{appUser.username}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {selectedInvitees.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedInvitees.map(userId => {
                          const appUser = allUsers.find(u => u.id === userId);
                          return appUser ? (
                            <Badge key={userId} variant="secondary" className="pl-2">
                              @{appUser.username}
                              <button
                                onClick={() => removeInvitee(userId)}
                                className="ml-1 hover:text-destructive"
                                type="button"
                              >
                                <X size={14} />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Challenge"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-heading font-bold mb-6">Challenges</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="active" className="rounded-lg">Active</TabsTrigger>
            <TabsTrigger value="done" className="rounded-lg">Done</TabsTrigger>
            <TabsTrigger value="discover" className="rounded-lg">Discover</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {invites.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Bell size={16} />
                  Challenge Invitations
                </h3>
                {invites.map(invite => (
                  <Card key={invite.id} className="overflow-hidden border-none shadow-sm dark:bg-zinc-900">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img src={invite.invitedByAvatar} alt={invite.invitedByUsername} className="w-10 h-10 rounded-full flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm"><span className="text-muted-foreground">{invite.invitedByUsername}</span> invited you to</p>
                            <p className="text-sm font-medium text-primary capitalize">{invite.challengeTitle}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Check size={16} className="mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(invite.id)}
                            className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <Button 
              onClick={() => {
                setIsCreating(true);
                generateRandomGoal();
              }}
              className="w-full py-6 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-auto" 
              variant="ghost"
            >
              + Create Challenge
            </Button>
            
            {myChallenges.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Trophy className="mx-auto mb-4 opacity-20" size={48} />
                <p>No active challenges yet. Create one to get started!</p>
              </div>
            ) : (
              myChallenges.map(challenge => (
                <ChallengeCard 
                  key={challenge.id} 
                  challenge={challenge} 
                  currentUserId={user?.uid || ""} 
                  isParticipant={true}
                  allUsers={users}
                  onInvite={handleInviteToChallenge}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="done" className="space-y-4">
            {doneChallenges.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Trophy className="mx-auto mb-4 opacity-20" size={48} />
                <p>No completed challenges yet. Keep going!</p>
              </div>
            ) : (
              doneChallenges.map(challenge => (
                <ChallengeCard 
                  key={challenge.id} 
                  challenge={challenge} 
                  currentUserId={user?.uid || ""} 
                  isParticipant={true}
                  isDone={true}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="discover">
            <div className="space-y-4">
              {discoverChallenges.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Trophy className="mx-auto mb-4 opacity-20" size={48} />
                  <p>No public challenges available. Create one to get started!</p>
                </div>
              ) : (
                discoverChallenges.map(challenge => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge} 
                    currentUserId={user?.uid || ""} 
                    isParticipant={false}
                    onJoin={() => handleJoinChallenge(challenge.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </Layout>
  );
}

function ChallengeCard({ 
  challenge, 
  currentUserId, 
  isParticipant,
  onJoin,
  isDone = false,
  allUsers = [],
  onInvite
}: { 
  challenge: Challenge; 
  currentUserId: string;
  isParticipant: boolean;
  onJoin?: () => void;
  isDone?: boolean;
  allUsers?: AppUser[];
  onInvite?: (challengeId: string, inviteeId: string) => void;
}) {
  const myParticipant = challenge.participants?.find((p) => p.userId === currentUserId);
  const myProgress = myParticipant?.progress || 0;
  const progressPercent = Math.min(100, Math.round((myProgress / challenge.goal) * 100));
  
  const sortedParticipants = [...(challenge.participants || [])].sort((a, b) => b.progress - a.progress);
  const myRank = sortedParticipants.findIndex(p => p.userId === currentUserId) + 1;

  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const hasStarted = startDate <= now;
  const hasEnded = endDate <= now;

  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-zinc-900">
      <div 
        className="h-2" 
        style={{ 
          background: `linear-gradient(to right, ${challenge.colors?.from || '#6C5CE7'}, ${challenge.colors?.to || '#00B894'})` 
        }} 
      />
      <CardContent className="p-5 dark:text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg mb-1">{challenge.title}</h3>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium uppercase">{challenge.type}</span>
                {challenge.isPublic ? (
                  <span className="flex items-center gap-1"><Globe size={12} /> Public</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock size={12} /> Private</span>
                )}
              </div>
              {hasEnded ? (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <Clock size={12} /> Challenge ended
                </span>
              ) : !hasStarted ? (
                <span className="flex items-center gap-1 text-accent font-medium">
                  <Clock size={12} /> Starts in {formatDistanceToNow(startDate)}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Ends in {formatDistanceToNow(endDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex -space-x-2">
            {(challenge.participants || []).slice(0, 3).map((p) => (
              <img key={p.userId} src={p.avatar} alt={p.username} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
            ))}
            {(challenge.participants?.length || 0) > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[10px] font-bold">
                +{(challenge.participants?.length || 0) - 3}
              </div>
            )}
          </div>
        </div>
        
        {isParticipant ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">Your Progress</span>
                <span className="text-muted-foreground">{myProgress} / {challenge.goal}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                  myRank === 1 ? "bg-yellow-100 text-yellow-700" :
                  myRank === 2 ? "bg-gray-100 text-gray-600" :
                  myRank === 3 ? "bg-orange-100 text-orange-700" :
                  "bg-muted text-muted-foreground"
                )}>
                  {myRank > 0 ? `#${myRank}` : "-"}
                </div>
                <div>
                  <p className="text-sm font-medium">Your Rank</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.participants?.length || 0} participant{(challenge.participants?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Goal: <span className="font-medium text-foreground">{challenge.goal} {challenge.type === 'run' ? 'km' : 'reps'}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {challenge.participants?.length || 0} participant{(challenge.participants?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={onJoin} size="sm" className="gap-2">
              <UserPlus size={16} />
              Join
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
