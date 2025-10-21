import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { ThemeToggle } from './ui/theme-toggle';
import { BRANCHES, YEARS, COMPANIES } from '../data/companies';
import { submitFormData } from '../services/api';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const InternshipForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    rollNo: '',
    branch: '',
    year: '',
    companyChoice: '',
    company1: '',
    company1Positions: [],
    company2: '',
    company2Positions: [],
    company3: '',
    company3Positions: [],
    resume: null
  });

  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Company 1, 3: Company 2, 4: Company 3, 5: Resume
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [tempCompanyData, setTempCompanyData] = useState({
    company: '',
    positions: []
  });

  // Load existing company data when navigating to a company step
  React.useEffect(() => {
    if (currentStep >= 2 && currentStep <= 4) {
      const companyNum = currentStep - 1; // Step 2 = Company 1, Step 3 = Company 2, Step 4 = Company 3
      const existingCompany = formData[`company${companyNum}`];
      const existingPositions = formData[`company${companyNum}Positions`];
      
      // Only load if temp data is empty (not already editing)
      if (existingCompany && !tempCompanyData.company) {
        setTempCompanyData({
          company: existingCompany,
          positions: existingPositions
        });
      }
    }
  }, [currentStep]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTempCompanyChange = (companyId) => {
    setTempCompanyData({
      company: companyId,
      positions: []
    });
  };

  const handleTempPositionToggle = (positionId) => {
    const currentPositions = tempCompanyData.positions;

    if (currentPositions.includes(positionId)) {
      setTempCompanyData(prev => ({
        ...prev,
        positions: currentPositions.filter(id => id !== positionId)
      }));
    } else {
      if (currentPositions.length < 2) {
        setTempCompanyData(prev => ({
          ...prev,
          positions: [...currentPositions, positionId]
        }));
      } else {
        alert('You can select a maximum of 2 positions per company');
      }
    }
  };

  const saveCurrentCompany = (companyNum) => {
    setFormData(prev => ({
      ...prev,
      [`company${companyNum}`]: tempCompanyData.company,
      [`company${companyNum}Positions`]: tempCompanyData.positions
    }));
    // Clear temp data for next company
    setTempCompanyData({
      company: '',
      positions: []
    });
  };

  const handleNext = () => {
    // Validate basic info before proceeding
    if (!formData.name || !formData.contact || !formData.email || !formData.rollNo || !formData.branch || !formData.year) {
      return;
    }
    setCurrentStep(2); // Go to Company 1
  };

  const handleBackFromCompany = (companyNum) => {
    // Clear temp data when going back
    setTempCompanyData({
      company: '',
      positions: []
    });
    
    // Clear the company data being edited
    setFormData(prev => ({
      ...prev,
      [`company${companyNum}`]: '',
      [`company${companyNum}Positions`]: []
    }));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setResumeFile(file);
      setFormData(prev => ({
        ...prev,
        resume: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.contact || !formData.email || !formData.branch || !formData.year) {
        setSubmitStatus('error');
        setErrorMessage('Please fill all required fields in Basic Info');
        setIsSubmitting(false);
        return;
      }

      // At least Company 1 must be filled
      if (!formData.company1 || formData.company1Positions.length === 0) {
        setSubmitStatus('error');
        setErrorMessage('You must select at least Company 1 with positions');
        setIsSubmitting(false);
        return;
      }

      if (!resumeFile) {
        setSubmitStatus('error');
        setErrorMessage('Please upload your resume');
        setIsSubmitting(false);
        return;
      }

      const submitData = new FormData();
      
      // Append all form fields with proper values
      submitData.append('name', formData.name || '');
      submitData.append('contact', formData.contact || '');
      submitData.append('email', formData.email || '');
      submitData.append('rollNo', formData.rollNo || '');
      submitData.append('branch', formData.branch || '');
      submitData.append('year', formData.year || '');
      submitData.append('company1', formData.company1 || '');
      submitData.append('company1Positions', JSON.stringify(formData.company1Positions || []));
      submitData.append('company2', formData.company2 || '');
      submitData.append('company2Positions', JSON.stringify(formData.company2Positions || []));
      submitData.append('company3', formData.company3 || '');
      submitData.append('company3Positions', JSON.stringify(formData.company3Positions || []));

      // Append resume file
      if (resumeFile) {
        submitData.append('resume', resumeFile);
      }

      console.log('Submitting form data...');
      const response = await submitFormData(submitData);
      setSubmitStatus('success');
      console.log('Form submitted successfully:', response);
      
      // Reset form after successful submission
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error submitting form:', error);
      let errorMsg = 'An error occurred while submitting the form';
      
      if (error.response) {
        console.error('Server response:', error.response.data);
        errorMsg = error.response.data.message || 'Failed to submit form. Server error.';
      } else if (error.request) {
        console.error('No response from server');
        errorMsg = 'Cannot connect to server. Please make sure the server is running on port 5000.';
      } else {
        console.error('Error:', error.message);
        errorMsg = error.message || 'An error occurred while submitting the form';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="contact" className="text-sm font-medium">Contact *</Label>
          <Input
            id="contact"
            name="contact"
            type="tel"
            value={formData.contact}
            onChange={handleInputChange}
            placeholder="Enter your contact number"
            className="mt-1.5"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email address"
          className="mt-1.5"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rollNo" className="text-sm font-medium">Roll Number *</Label>
          <Input
            id="rollNo"
            name="rollNo"
            value={formData.rollNo}
            onChange={handleInputChange}
            placeholder="Enter your roll number"
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="year" className="text-sm font-medium">Year *</Label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
            required
          >
            <option value="">Select Year</option>
            {YEARS.map(year => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="branch" className="text-sm font-medium">Branch *</Label>
        <select
          id="branch"
          name="branch"
          value={formData.branch}
          onChange={handleInputChange}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
          required
        >
          <option value="">Select Branch</option>
          {BRANCHES.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button 
          type="button" 
          onClick={handleNext}
          className="flex-1 h-11"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderCompanySelection = (companyNum) => {
    const selectedCompany = tempCompanyData.company;
    const company = COMPANIES.find(c => c.id === parseInt(selectedCompany));
    const isOptional = companyNum > 1;

    return (
      <div className="space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Company {companyNum}</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isOptional 
                ? 'You can skip this if you want to apply to fewer companies'
                : 'Select your preferred company and up to 2 positions'
              }
            </CardDescription>
          </CardHeader>
        </Card>

        <div>
          <Label className="text-sm font-medium">Select Company {!isOptional && '*'}</Label>
          <select
            className="w-full mt-1.5 h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedCompany}
            onChange={(e) => handleTempCompanyChange(e.target.value)}
          >
            <option value="">Choose a company</option>
            {COMPANIES.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {company && (
          <div>
            <Label className="text-sm font-medium">Select Positions (Max 2) *</Label>
            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-2">
              {company.positions.map((position) => (
                <div key={position.id} className="flex items-start space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 bg-card transition-colors">
                  <Checkbox
                    id={`temp-${position.id}`}
                    checked={tempCompanyData.positions.includes(position.id)}
                    onCheckedChange={() => handleTempPositionToggle(position.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label 
                      htmlFor={`temp-${position.id}`} 
                      className="font-medium cursor-pointer text-sm sm:text-base"
                    >
                      {position.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 font-medium">
              Selected: {tempCompanyData.positions.length} of 2
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              handleBackFromCompany(companyNum);
              setCurrentStep(currentStep - 1);
            }}
            className="flex-1 h-11"
          >
            Back
          </Button>
          
          {isOptional && (
            <Button 
              type="button" 
              onClick={() => {
                setTempCompanyData({ company: '', positions: [] });
                // Skipping any optional company goes directly to resume upload
                setCurrentStep(5);
              }}
              className="flex-1"
              variant={selectedCompany ? "outline" : "default"}
            >
              {selectedCompany ? 'Skip and Continue' : 'Skip to Resume'}
            </Button>
          )}
          
          {(selectedCompany && tempCompanyData.positions.length > 0) && (
            <Button 
              type="button" 
              onClick={() => {
                saveCurrentCompany(companyNum);
                setCurrentStep(currentStep + 1);
              }}
              className="flex-1"
            >
              Save & Continue
            </Button>
          )}
        </div>
      </div>
    );
  };



  const renderResumeUpload = () => {
    // Show summary of companies applied to with names and positions
    const appliedCompanies = [];
    
    if (formData.company1) {
      const company = COMPANIES.find(c => c.id === parseInt(formData.company1));
      if (company) {
        const positions = formData.company1Positions.map(posId => {
          const pos = company.positions.find(p => p.id === posId);
          return pos ? pos.name : '';
        }).filter(Boolean);
        
        appliedCompanies.push({
          name: company.name,
          positions: positions
        });
      }
    }
    
    if (formData.company2) {
      const company = COMPANIES.find(c => c.id === parseInt(formData.company2));
      if (company) {
        const positions = formData.company2Positions.map(posId => {
          const pos = company.positions.find(p => p.id === posId);
          return pos ? pos.name : '';
        }).filter(Boolean);
        
        appliedCompanies.push({
          name: company.name,
          positions: positions
        });
      }
    }
    
    if (formData.company3) {
      const company = COMPANIES.find(c => c.id === parseInt(formData.company3));
      if (company) {
        const positions = formData.company3Positions.map(posId => {
          const pos = company.positions.find(p => p.id === posId);
          return pos ? pos.name : '';
        }).filter(Boolean);
        
        appliedCompanies.push({
          name: company.name,
          positions: positions
        });
      }
    }

    return (
      <div className="space-y-6">
        {appliedCompanies.length > 0 && (
          <Card className="bg-primary/10 border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Application Summary</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                <div className="space-y-3 mt-2">
                  {appliedCompanies.map((company, index) => (
                    <div key={index} className="text-foreground">
                      <p className="font-semibold text-base">{company.name}</p>
                      <p className="text-sm text-muted-foreground ml-4">
                        • {company.positions.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div>
          <Label htmlFor="resume" className="text-sm font-medium">Upload Resume *</Label>
          <div className="mt-3">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="resume" className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 border-border hover:border-primary transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm sm:text-base text-foreground text-center">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">PDF, DOC, DOCX (MAX. 5MB)</p>
                </div>
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />
              </label>
            </div>
            {resumeFile && (
              <div className="mt-3 p-3 sm:p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm sm:text-base text-foreground flex items-center font-medium">
                  <CheckCircle className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                  <span className="truncate">{resumeFile.name}</span>
                </p>
              </div>
            )}
          </div>
        </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => {
            // Clear resume when going back
            setResumeFile(null);
            setFormData(prev => ({ ...prev, resume: null }));
            
            // Go back to Company 3 (always, since it's the last step before resume)
            setCurrentStep(4);
          }}
          className="flex-1 h-11"
        >
          Back
        </Button>
        <Button 
          type="submit"
          className="flex-1 h-11"
          disabled={!resumeFile || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>

      {submitStatus === 'success' && (
        <div className="p-4 sm:p-5 bg-primary/10 border-2 border-primary/40 rounded-lg flex items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-primary flex-shrink-0" />
          <p className="text-sm sm:text-base font-medium text-foreground">Application submitted successfully! Redirecting...</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="p-4 sm:p-5 bg-destructive/10 border-2 border-destructive/40 rounded-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start">
            <XCircle className="w-6 h-6 sm:w-7 sm:h-7 mr-3 flex-shrink-0 mt-0.5 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-foreground">Error submitting application</p>
              {errorMessage && <p className="text-xs sm:text-sm mt-1.5 text-muted-foreground break-words">{errorMessage}</p>}
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 px-3 sm:px-4 transition-colors duration-300">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl border-border">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-heading bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              TEDxCRCE Internship Expo 2025
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              Apply for internship opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Progress Stepper - Responsive */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex justify-between items-center min-w-[500px] sm:min-w-0">
                {/* Step 1 */}
                <div className={`text-center ${currentStep >= 1 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    currentStep >= 1 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                  }`}>
                    {currentStep > 1 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">1</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm mt-1 whitespace-nowrap hidden sm:block">Basic Info</p>
                  <p className="text-xs mt-1 sm:hidden">Info</p>
                </div>
                <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                
                {/* Step 2 */}
                <div className={`text-center ${currentStep >= 2 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    currentStep >= 2 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                  }`}>
                    {currentStep > 2 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">2</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm mt-1 whitespace-nowrap">Co. 1</p>
                </div>
                <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
                
                {/* Step 3 */}
                <div className={`text-center ${currentStep >= 3 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    currentStep >= 3 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                  }`}>
                    {currentStep > 3 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">3</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm mt-1 whitespace-nowrap">Co. 2</p>
                </div>
                <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all ${currentStep >= 4 ? 'bg-primary' : 'bg-muted'}`}></div>
                
                {/* Step 4 */}
                <div className={`text-center ${currentStep >= 4 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    currentStep >= 4 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                  }`}>
                    {currentStep > 4 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">4</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm mt-1 whitespace-nowrap">Co. 3</p>
                </div>
                <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all ${currentStep >= 5 ? 'bg-primary' : 'bg-muted'}`}></div>
                
                {/* Step 5 */}
                <div className={`text-center ${currentStep >= 5 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    currentStep >= 5 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                  }`}>
                    <span className="text-sm">5</span>
                  </div>
                  <p className="text-xs sm:text-sm mt-1 whitespace-nowrap">Resume</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderBasicInfo()}
              {currentStep === 2 && renderCompanySelection(1)}
              {currentStep === 3 && renderCompanySelection(2)}
              {currentStep === 4 && renderCompanySelection(3)}
              {currentStep === 5 && renderResumeUpload()}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InternshipForm;
