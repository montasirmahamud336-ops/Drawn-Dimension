import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useLiveData } from "@/hooks/useLiveData";

type OurEmployeesSectionProps = {
  showAll?: boolean;
};

const PREVIEW_LIMIT = 6;

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const OurEmployeesSection = ({ showAll = false }: OurEmployeesSectionProps) => {
  const { data: employees, loading } = useLiveData("team", {
    params: { memberType: "employee" },
  });

  const visibleEmployees = showAll ? employees : employees.slice(0, PREVIEW_LIMIT);
  const hasMore = !showAll && employees.length > PREVIEW_LIMIT;

  return (
    <section className="section-padding">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Our People
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Our Employees
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No employees found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {visibleEmployees.map((employee: any, index: number) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="glass-card overflow-hidden border-border/55 bg-card/45"
                >
                  <div className="aspect-square bg-muted/40">
                    {employee.image_url ? (
                      <img
                        src={employee.image_url}
                        alt={employee.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-lg font-bold">
                        {typeof employee.name === "string" && employee.name.trim()
                          ? getInitials(employee.name)
                          : <Users className="w-6 h-6 opacity-70" />}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="text-sm font-semibold text-foreground truncate">{employee.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{employee.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <Link to="/our-employees" className="btn-outline inline-flex">
                  View More
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default OurEmployeesSection;
