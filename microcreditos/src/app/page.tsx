import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import {Verify} from '../components/Verify';

export default function Home() {
  return (
    <Page>
      <Page.Header>
        <h1 className="text-2xl font-bold">Microcréditos</h1>
      </Page.Header>
      <Page.Main>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-xl font-semibold mb-4">Bienvenido a Microcréditos</h2>
          <p className="mb-4">Verifica tu identidad para acceder a microcréditos.</p>
          <Verify />
        </div>
      </Page.Main>
      
        
    </Page>
  );
}
