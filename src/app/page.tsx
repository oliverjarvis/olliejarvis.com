"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, GithubIcon, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Parser from 'rss-parser';

export default function Home() {
  const [openModal, setOpenModal] = useState<string | null>(null);

  const [latestArticle, setLatestArticle] = useState<{title: string; link: string}|null>(null);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const response = await fetch('/api/fetchsubstack');
        const data = await response.json();
        setLatestArticle(data.latestArticle);
        console.log(data);
      } catch (error) {
        console.error('Error fetching latest Substack article:', error);
      }
    }

    fetchArticle();
  }, []);

  const projects = [
    {
      id: "representation-engineer",
      title: "Representation Engineer for Reasoning",
      description: "Using representation engineering techniques to adjust the reasoning capabilities of LLMs",
      technologies: ["PyTorch", "LLM", "GenAI", "Thesis"],
    },
    {
      id: "project-alpha",
      title: "Project Alpha",
      description: "An AI-powered task management system",
      technologies: ["React", "Node.js", "MongoDB"],
    },
    {
      id: "project-beta",
      title: "Project Beta",
      description: "Another exciting project",
      technologies: ["React", "Node.js", "MongoDB"],
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-left p-8">
      <div className="text-left mb-8 flex flex-col items-left">
        <Image
          src="/profile.png"
          alt="Oliver Jarvis"
          width={200}
          height={200}
          className="rounded-full mb-4"
        />
        <h1 className="text-3xl font-bold">Oliver Jarvis</h1>
        <p className="text-lg mt-2 text-gray-600">
          <span className="font-semibold">MSc Data Science</span> @ IT University of Copenhagen
          <br />
          <span className="font-semibold">BSc Cognitive Science and Mathematics</span> @ Aarhus University, DK
        </p>
        <div className="flex flex-col mt-4 space-y-2">
          <Link href="https://twitter.com/olliesjarvis" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-400 hover:text-blue-500 transition-colors">
            <Twitter size={20} />
            <span>twitter.com/olliesjarvis</span>
          </Link>
          <Link href="https://github.com/oliverjarvis" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
            <Github size={20} />
            <span>github.com/oliverjarvis</span>
          </Link>
        </div>
      </div>
      
      <p className="max-w-2xl text-left mb-8">
        I&apos;m a passionate data scientist, web developer, and full-stack engineer with a love for
        working on new projects and exploring various programming challenges. My expertise spans
        across data analysis, web technologies, and end-to-end system development. I&apos;m particularly
        enthusiastic about conducting research and engaging in independent studies, always seeking
        to expand my knowledge and push the boundaries of what&apos;s possible in technology.
      </p>
      
      {latestArticle && (
        <section className="w-full max-w-4xl mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-left">Latest Substack Article</h2>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{latestArticle.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={latestArticle.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Read the full article
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
      
      <section className="w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-6 text-left">Featured Projects</h2>
        <div className="flex flex-col space-y-6 w-full">
          {projects.map((project) => (
            <Dialog key={project.id} open={openModal === project.id} onOpenChange={(open) => setOpenModal(open ? project.id : null)}>
              <DialogTrigger asChild>
                <Card className="w-full cursor-pointer">
                  <div className="flex">
                    <CardHeader className="flex-1">
                      <CardTitle>{project.title}</CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <div className="flex-1 flex items-center justify-center ">
                      <div className="flex flex-wrap gap-2 ">
                        {project.technologies.map((tech, index) => (
                          <div key={index} className="px-2 py-1 bg-gray-200 rounded-full text-sm">
                            {tech}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{project.title}</DialogTitle>
                  <DialogDescription>{project.description}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-2 mt-4">
                  {project.technologies.map((tech, index) => (
                    <div key={index} className="px-2 py-1 bg-gray-200 rounded-full text-sm">
                      {tech}
                    </div>
                  ))}
                </div>
                {/* Add more detailed project information here */}
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </section>
      
      <section className="mt-12 ">
        <h2 className="text-2xl font-semibold mb-6 text-left">More Projects</h2>
        <Tabs defaultValue="web" className="w-full">
          <TabsList className="w-full max-w-4xl">
            <TabsTrigger value="data-science" className="flex-1">Data Science</TabsTrigger>
            <TabsTrigger value="web" className="flex-1">Web</TabsTrigger>
            <TabsTrigger value="mobile" className="flex-1">Mobile</TabsTrigger>
            <TabsTrigger value="games" className="flex-1">Games</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>
    </main>
  );
}
