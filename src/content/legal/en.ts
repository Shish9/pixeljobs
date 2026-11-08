import type { LegalSet } from "./types";

/** English drafts. Not legal advice; must be reviewed by a lawyer licensed in Iraq / the Kurdistan Region before launch. */
const en: LegalSet = {
  guidelines: {
    intro: "PixelJobs works when people can trust each other. These rules apply to everything you post or send here.",
    sections: [
      {
        h: "Be honest",
        p: [
          "Use your real name or business name. Show only work you made or were part of, and say what your part was.",
          "Describe services and projects accurately: what is included, the price, and how long it takes.",
        ],
      },
      {
        h: "Be respectful",
        p: [
          "No harassment, threats, hate speech or sexual content. This applies in messages too.",
          "Disagree about the work, not about the person. Keep reviews factual and fair.",
        ],
      },
      {
        h: "Keep it safe",
        p: [
          "Don't ask for passwords, ID documents or bank details in messages.",
          "Don't post contact details or links meant to move people off the platform before an agreement is made.",
          "No spam, mass messages, fake reviews or multiple accounts.",
        ],
      },
      {
        h: "Not allowed",
        p: [
          "Illegal goods or services, academic cheating (writing exams or theses for others), fake documents, gambling, adult content, and anything that infringes someone else's rights.",
        ],
      },
      {
        h: "What happens when rules are broken",
        p: [
          "Anyone can report a profile, service, project, portfolio item, review or message. Moderators review reports and may hide content, suspend listings or suspend accounts. Every moderation action is logged.",
          "Moderators can't read private conversations. When a message is reported, they see a copy of that message only.",
        ],
      },
    ],
  },
  terms: {
    intro: "These terms describe how PixelJobs works today. By creating an account you agree to them.",
    sections: [
      {
        h: "What PixelJobs is",
        p: [
          "PixelJobs is a place for clients and freelancers in Kurdistan and Iraq to find each other, agree on work and talk about it.",
          "PixelJobs is not a party to the agreements between clients and freelancers, and is not an employer or agency.",
        ],
      },
      {
        h: "Payments",
        p: [
          "PixelJobs does not process payments, hold money, offer escrow, or guarantee that work will be delivered or paid for. Clients and freelancers arrange payment directly and at their own risk.",
          "We plan to add payments later. When we do, these terms will change and you will be told first.",
        ],
      },
      {
        h: "Your account",
        p: [
          "You must be at least 18, give accurate information and keep your password safe. One person, one account.",
          "We do not verify identities. A profile's details are provided by its owner.",
        ],
      },
      {
        h: "Your content",
        p: [
          "You keep ownership of what you post. You allow PixelJobs to show it on the platform so others can see your profile, services and work.",
          "You are responsible for what you post and send, and for having the right to share it.",
        ],
      },
      {
        h: "Moderation and closing accounts",
        p: [
          "We may remove content or suspend accounts that break the community guidelines or these terms. You can ask us to review a decision.",
          "You can stop using PixelJobs at any time.",
        ],
      },
      {
        h: "Limits",
        p: ["PixelJobs is provided as it is, while it is being built. We are not responsible for losses from agreements between users."],
      },
    ],
  },
  privacy: {
    intro: "This explains what we store about you, why, and what you can do about it.",
    sections: [
      {
        h: "What we store",
        p: [
          "Account: email address and password (stored hashed by our authentication provider).",
          "Profile: the name, photo, city, skills, languages, rates, portfolio and other details you choose to add.",
          "Activity: services, projects, requests, proposals, messages, reviews, reports and saved items you create.",
          "Settings: language, digit style and email preferences.",
        ],
      },
      {
        h: "Who can see it",
        p: [
          "Public profiles, published services, open projects, portfolio items and published reviews can be seen by anyone. You can make your profile private in Settings.",
          "Requests, proposals and messages are visible only to the two people involved. Staff can see reports and moderation records, but not private conversations.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "We use cookies to keep you signed in and to remember your language (pj_locale) and digit style (pj_digits). We do not use advertising or tracking cookies.",
        ],
      },
      {
        h: "Where it is kept",
        p: ["Data is stored with our database and hosting providers (Supabase and Vercel). We do not sell personal data."],
      },
      {
        h: "Your choices",
        p: [
          "You can edit your profile and settings at any time. To get a copy of your data or delete your account, contact us through the channels in the footer.",
        ],
      },
    ],
  },
  safety: {
    intro: "Most work goes well. These habits help when it doesn't.",
    sections: [
      {
        h: "Before you start",
        p: [
          "Check the profile, portfolio and reviews. Ask questions in PixelJobs messages so there is a written record.",
          "Agree in writing on what will be delivered, the price in dinars, the deadline and the number of revisions.",
        ],
      },
      {
        h: "Payment",
        p: [
          "PixelJobs does not hold payments or offer escrow yet. For larger jobs, split payment into stages and pay for each finished stage.",
          "Be careful with anyone who insists on full payment upfront, asks you to pay a 'registration fee', or pressures you to decide quickly.",
        ],
      },
      {
        h: "Protect your information",
        p: [
          "Never share passwords, verification codes or bank card details. PixelJobs staff will never ask for them.",
          "Be careful opening files or links from people you don't know.",
        ],
      },
      {
        h: "If something goes wrong",
        p: [
          "Use the Report button on the profile, listing or message. Describe what happened. Moderators review every report.",
          "If you are in danger or have been defrauded, contact the police.",
        ],
      },
    ],
  },
};

export default en;
