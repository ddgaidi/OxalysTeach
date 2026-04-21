"use client";

import { motion } from "framer-motion";
import { Button } from "@/src/components/ui/button";
import { ArrowRight, Sparkles, BookOpen, Users, Cpu } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-32">
      {/* Background patterns */}
      <div className="absolute top-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.15),rgba(2,6,23,0))]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-3 py-1 text-sm font-medium text-orange-600 dark:text-orange-400"
          >
            <Sparkles size={16} />
            <span>Nouveauté : OxalysTeach v1.0 est là !</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Le futur de l'enseignement <br />
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              commence ici.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl"
          >
            Gérez vos cours, vos élèves et supervisez votre établissement en temps réel avec nos capteurs connectés. Simple, rapide et élégant.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button size="lg" variant="oxalys" className="h-12 rounded-full px-8 text-lg" asChild>
              <Link href="/login">
                Accéder au Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full px-8 text-lg" asChild>
              <Link href="/dashboard">Voir la démo</Link>
            </Button>
          </motion.div>

          {/* Stats/Features showcase */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20 grid w-full grid-cols-1 gap-8 sm:grid-cols-4"
          >
            {[
              { icon: BookOpen, label: "Ressources", value: "500+", color: "orange" },
              { icon: Users, label: "Professeurs", value: "1.2k", color: "red" },
              { icon: Cpu, label: "Capteurs Air", value: "Actif", color: "orange" },
              { icon: Sparkles, label: "Cours créés", value: "10k+", color: "orange" },
            ].map((stat, i) => (
              <div 
                key={i}
                className="group relative rounded-3xl border border-slate-200 bg-white/50 p-8 text-center backdrop-blur-sm transition-all hover:border-orange-500/30 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 transition-transform group-hover:scale-110`}>
                  <stat.icon size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
