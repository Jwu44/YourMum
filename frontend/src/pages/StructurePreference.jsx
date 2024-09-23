import React from 'react';
import { RadioGroup, Heading } from 'evergreen-ui';
import { useRouter } from 'next/router';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const StructurePreference = ({ formData, setFormData }) => {
  const router = useRouter();

  // Initialize layout_preference if it doesn't exist
  React.useEffect(() => {
    if (!formData.layout_preference) {
      setFormData({
        ...formData,
        layout_preference: {
          structure: 'structured', // Set default value
          subcategory: ''
        }
      });
    }
  }, [formData, setFormData]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setFormData(prevData => ({
      ...prevData,
      layout_preference: {
        ...prevData.layout_preference,
        structure: value,
        subcategory: '' // Reset subcategory when structure changes
      }
    }));
  };

  const handleNext = () => {
    if (formData.layout_preference.structure === 'structured') {
      router.push('/subcategory-preference');
    } else {
      router.push('/layout-preference');
    }
  };

  const handlePrevious = () => {
    navigate('/energy-patterns');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Customize Your To-Do List</Heading>
      <p>Let&apos;s understand your preferred daily structure.</p>
      
      <RadioGroup
        label="Day Structure"
        value={formData.layout_preference.structure || ''}
        options={[
          { label: 'I prefer a structured day with clear sections', value: 'structured' },
          { label: 'I like flexibility and do not want sections', value: 'unstructured' }
        ]}
        onChange={handleInputChange}
        name="structure"
      />
      
      <OnboardingNav 
        onBack={handlePrevious} 
        onNext={handleNext}
        disableNext={!formData.layout_preference.structure}
      />
    </CenteredPane>
  );
};

export async function getStaticProps() {
  return {
    props: {
      formData: {
        layout_preference: {
          structure: '',
          subcategory: '',
          timeboxed: ''
        },
      },
    },
  };
}

export default StructurePreference;