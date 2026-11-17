'use client';

import { FileText } from 'lucide-react';
import { getCompetitionRules, updateCompetitionRules } from '@/lib/cmsApi';
import defaults from '@/lib/appDefaultContent.json';
import TextPageEditor from './TextPageEditor';

export default function CompetitionRules() {
  return (
    <TextPageEditor
      title="Competition Rules"
      icon={FileText}
      shownIn="Shown in the app on the Competition Rules screen (linked from live and upcoming competitions)."
      defaultText={''}
      contentKey="competitionRules"
      load={getCompetitionRules}
      save={updateCompetitionRules}
    />
  );
}
