import React from 'react';
import { Pane, Paragraph, Heading, Checkbox } from 'evergreen-ui';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import { useRouter } from 'next/router';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import { handleEnergyChange } from '../helper'; // Import the function from helper.jsx

const EnergyPattern = ({ formData, setFormData }) => {
  const router = useRouter();

  const handleNext = () => {
    router.push('/structure-preference');
  };

  const handlePrevious = () => {
    router.push('/tasks');
  };

  const energyOptions = [
    { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  return (
    <CenteredPane>
      <Pane>
        <Heading size={700} marginBottom={16}>How&apos;s your energy during the day?</Heading>
        <Paragraph marginBottom={24}>
          Understanding your unique energy patterns helps us create a schedule that maximizes your productivity.
        </Paragraph>
        <Paragraph marginBottom={24}>
          Select all that apply:
        </Paragraph>
        <Pane display="flex" justifyContent="space-between" flexWrap="wrap">
          {energyOptions.map((option) => (
            <Pane
              key={option.value}
              background="tint2"
              borderRadius={8}
              padding={16}
              width="19%"
              marginBottom={16}
              display="flex"
              flexDirection="column"
              alignItems="center"
              textAlign="center"
            >
              <option.icon size={32} style={{ marginBottom: 12 }} />
              <Paragraph marginBottom={12} lineHeight={1.2}>{option.label}</Paragraph>
              <Checkbox
                checked={(formData.energy_patterns || []).includes(option.value)}
                onChange={() => handleEnergyChange(setFormData)(option.value)}
              />
            </Pane>
          ))}
        </Pane>
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export async function getStaticProps() {
  return {
    props: {
      formData: {},
    },
  };
}

export default EnergyPattern;