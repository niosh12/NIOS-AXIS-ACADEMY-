

import React, { useState } from 'react';
import { useAuth } from '../../App';
import { Card, Button, TextArea, Input } from '../../components/UI';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Send, CheckCircle, ClipboardList, AlertTriangle, Sparkles } from 'lucide-react';
import { WorkReport } from '../../types';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [submittedReport, setSubmittedReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    completeWork: '',
    pendingWork: '',
    nextDayPlan: '',
    remark: ''
  });

  // Validation State
  const [validationError, setValidationError] = useState<string | null>(null);

  // AI Logic: Auto Report Quality Check
  const validateReportQuality = (): string | null => {
    const minWords = 5;
    const minChars = 20;

    const countWords = (str: string) => str.trim().split(/\s+/).length;

    // 1. Check Empty/Short Fields
    if (formData.completeWork.length < minChars || countWords(formData.completeWork) < minWords) {
      return "Your 'Completed Work' detail is too short. Please describe what you did today in more detail.";
    }
    if (formData.nextDayPlan.length < minChars || countWords(formData.nextDayPlan) < minWords) {
      return "Your 'Next Day Plan' is too vague. Please specify what you plan to achieve tomorrow.";
    }

    // 2. Check Repetition
    if (formData.completeWork.toLowerCase().trim() === formData.pendingWork.toLowerCase().trim()) {
      return "Completed Work and Pending Work cannot be exactly the same.";
    }
    if (formData.completeWork.toLowerCase().trim() === formData.nextDayPlan.toLowerCase().trim()) {
      return "Your plan for tomorrow seems to be a copy of today's work. Please update it.";
    }

    // 3. Check for "Nil", "Nothing", "Same" spam
    const spamWords = ['nil', 'nothing', 'same', 'no work', 'na'];
    if (spamWords.includes(formData.completeWork.toLowerCase().trim())) {
      return "Please provide a valid update for Completed Work. 'Nil' or 'Nothing' is not accepted.";
    }

    return null; // No errors
  };

  // Report Logic
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setValidationError(null);

    // Run Quality Check
    const qualityError = validateReportQuality();
    if (qualityError) {
      setValidationError(qualityError);
      return;
    }

    setLoadingReport(true);

    const report: WorkReport = {
      userId: user.userId,
      userName: user.name,
      date: new Date().toISOString(),
      submitTime: new Date().toLocaleTimeString(),
      completeWork: formData.completeWork,
      pendingWork: formData.pendingWork,
      nextDayPlan: formData.nextDayPlan,
      userRemark: formData.remark,
      status: 'submitted',
    };

    try {
      await addDoc(collection(db, 'reports'), report);
      setSubmittedReport(true);
    } catch (e) {
      console.error(e);
      alert("Failed to submit report");
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header for Report Page */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Daily Reporting</h2>
          <p className="text-gray-500 text-sm">Submit your work progress</p>
        </div>
      </div>

      {/* WORK REPORT SECTION */}
      <div>
        {submittedReport ? (
          <Card className="text-center py-12 bg-green-50 border-green-100 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle className="w-10 h-10 text-green-700" />
            </div>
            <h4 className="text-2xl font-bold text-green-900 mb-2">Report Sent!</h4>
            <p className="text-green-700 mb-6">Your daily work report has been submitted successfully.</p>
            <Button onClick={() => { setSubmittedReport(false); setFormData({completeWork:'', pendingWork:'', nextDayPlan:'', remark:''}) }} variant="outline" className="bg-white border-green-200 text-green-700 hover:bg-green-50">
              Submit Another Report
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmitReport} className="animate-in slide-in-from-bottom-4 duration-500">
            <Card className="space-y-6 shadow-md border-t-4 border-t-blue-500">
              
              <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 text-sm text-blue-800 border border-blue-100">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-bold">AI Quality Check Enabled</p>
                  <p>Please write detailed updates. Short or repeated reports will be automatically rejected.</p>
                </div>
              </div>

              <TextArea 
                label="1. Completed Work Today" 
                placeholder="List all the tasks you finished today (Min 5 words)..."
                value={formData.completeWork}
                onChange={e => setFormData({...formData, completeWork: e.target.value})}
                required
                className="bg-gray-50 focus:bg-white transition-colors"
              />
              <TextArea 
                label="2. Pending Work" 
                placeholder="Tasks that are still in progress..."
                value={formData.pendingWork}
                onChange={e => setFormData({...formData, pendingWork: e.target.value})}
                required
                className="bg-gray-50 focus:bg-white transition-colors"
              />
              <TextArea 
                label="3. Next Day Plan" 
                placeholder="What do you plan to achieve tomorrow?"
                value={formData.nextDayPlan}
                onChange={e => setFormData({...formData, nextDayPlan: e.target.value})}
                required
                className="bg-gray-50 focus:bg-white transition-colors"
              />
              <Input 
                label="4. Remark (Optional)" 
                placeholder="Any issues or specific notes?"
                value={formData.remark}
                onChange={e => setFormData({...formData, remark: e.target.value})}
                className="bg-gray-50 focus:bg-white transition-colors"
              />
              
              {validationError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-800 animate-pulse">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Report Quality Issue:</p>
                    <p className="text-sm">{validationError}</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button type="submit" className="w-full py-3 text-lg font-semibold shadow-lg bg-blue-600 hover:bg-blue-700" icon={Send} isLoading={loadingReport}>
                  Submit Daily Report
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;