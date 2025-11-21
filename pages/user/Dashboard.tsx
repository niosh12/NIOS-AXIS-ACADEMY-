
import React, { useState } from 'react';
import { useAuth } from '../../App';
import { Card, Button, TextArea, Input } from '../../components/UI';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Send, CheckCircle, ClipboardList } from 'lucide-react';
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

  // Report Logic
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
              <TextArea 
                label="1. Completed Work Today" 
                placeholder="List all the tasks you finished today..."
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
