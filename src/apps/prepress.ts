import {tutorialBuilderMain} from '../tutorial_builder';

async function go() {
  const succeeded = await tutorialBuilderMain(process.argv);

  if (succeeded) {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  } else {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

go();
