import { BrandLoading, LobeHubText } from '@lobehub/ui/brand';
import { Center } from 'react-layout-kit';

export default () => {

  return (
    <Center height={'100%'} width={'100%'}>
      <BrandLoading size={40} style={{ opacity: 0.6 }} text={LobeHubText} />
    </Center>
  );
};
